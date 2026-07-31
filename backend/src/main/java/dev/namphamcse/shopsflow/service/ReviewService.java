package dev.namphamcse.shopsflow.service;

import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.namphamcse.shopsflow.dto.request.ReviewRequest;
import dev.namphamcse.shopsflow.dto.response.ReviewResponse;
import dev.namphamcse.shopsflow.entity.Product;
import dev.namphamcse.shopsflow.entity.Review;
import dev.namphamcse.shopsflow.entity.ReviewRead;
import dev.namphamcse.shopsflow.entity.User;
import dev.namphamcse.shopsflow.entity.enums.NotificationType;
import dev.namphamcse.shopsflow.entity.enums.OrderStatus;
import dev.namphamcse.shopsflow.entity.enums.Role;
import dev.namphamcse.shopsflow.exception.BusinessRuleViolationException;
import dev.namphamcse.shopsflow.exception.ResourceNotFoundException;
import dev.namphamcse.shopsflow.repository.OrderRepository;
import dev.namphamcse.shopsflow.repository.ProductRepository;
import dev.namphamcse.shopsflow.repository.ReviewRepository;
import dev.namphamcse.shopsflow.repository.ReviewReadRepository;
import lombok.RequiredArgsConstructor;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class ReviewService {
    private static final EnumSet<OrderStatus> RECEIVED_STATUSES = EnumSet.of(
            OrderStatus.DELIVERED,
            OrderStatus.RETURN_REQUESTED,
            OrderStatus.RETURN_APPROVED,
            OrderStatus.RETURN_REJECTED,
            OrderStatus.RETURNED,
            OrderStatus.RETURN_RECEIVED,
            OrderStatus.REFUNDED,
            OrderStatus.REFUND_CONFIRMED);

    private final ReviewRepository reviewRepo;
    private final ReviewReadRepository reviewReadRepo;
    private final ProductRepository productRepo;
    private final OrderRepository orderRepo;
    private final NotificationService notificationService;
    private final AuditService auditService;

    @Transactional
    public ReviewResponse createReview(User user, Long productId, ReviewRequest req) {
        if (reviewRepo.existsByUserIdAndProductId(user.getId(), productId)) {
            throw new BusinessRuleViolationException("You already reviewed this product.");
        }
        Product product = productRepo.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + productId));
        if (!hasVerifiedPurchase(user.getId(), productId)) {
            throw new BusinessRuleViolationException("You can review this product after receiving it in an order.");
        }
        Review saved = reviewRepo.save(new Review(user, product, req.getStars(), req.getComment()));

        notificationService.notifyRole(Role.ADMIN, user, NotificationType.REVIEW,
                "New review for " + product.getName(), user.getName() + " posted a verified customer review.",
                "/admin#reviews");
        auditService.log(user, "REVIEW_CREATED", "REVIEW", saved.getId(), product.getName());
        return toResponse(saved);
    }

    @Transactional
    public ReviewResponse editReview(User user, Long reviewId, ReviewRequest req) {
        Review review = reviewRepo.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found: " + reviewId));
        if (!review.getUser().getId().equals(user.getId())) {
            throw new BusinessRuleViolationException("You can only edit your own review.");
        }
        review.setStars(req.getStars());
        review.setComment(req.getComment());
        reviewReadRepo.deleteByReviewId(reviewId);
        notificationService.notifyRole(Role.ADMIN, user, NotificationType.REVIEW,
                "Review updated for " + review.getProduct().getName(), user.getName() + " updated a product review.",
                "/admin#reviews");
        auditService.log(user, "REVIEW_UPDATED", "REVIEW", reviewId, review.getProduct().getName());
        return toResponse(review);
    }

    @Transactional
    public void deleteReview(User user, Long reviewId) {
        Review review = reviewRepo.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found: " + reviewId));
        if (!review.getUser().getId().equals(user.getId())) {
            throw new BusinessRuleViolationException("You can only delete your own review.");
        }
        String productName = review.getProduct().getName();
        reviewRepo.delete(review);
        notificationService.notifyRole(Role.ADMIN, user, NotificationType.REVIEW,
                "Review deleted for " + productName, user.getName() + " deleted a product review.", "/admin#reviews");
        auditService.log(user, "REVIEW_DELETED", "REVIEW", reviewId, productName);
    }

    public List<ReviewResponse> getProductReviews(Long productId) {
        if (!productRepo.existsById(productId)) {
            throw new ResourceNotFoundException("Product not found: " + productId);
        }
        return reviewRepo.findByProductId(productId).stream().map(this::toResponse).toList();
    }

    public List<ReviewResponse> getAllReviews() {
        return reviewRepo.findAllByOrderByCreatedAtDesc().stream().map(this::toResponse).toList();
    }

    public long getUnreadCount(User admin) {
        long total = reviewRepo.count();
        long read = reviewReadRepo.countByAdminId(admin.getId());
        return Math.max(0, total - read);
    }

    public Map<Long, Long> getUnreadCountsByProduct(User admin) {
        Set<Long> readReviewIds = reviewReadRepo.findByAdminId(admin.getId()).stream()
                .map(read -> read.getReview().getId())
                .collect(Collectors.toSet());
        Map<Long, Long> counts = new LinkedHashMap<>();
        for (Review review : reviewRepo.findAllByOrderByCreatedAtDesc()) {
            if (!readReviewIds.contains(review.getId())) {
                counts.merge(review.getProduct().getId(), 1L, Long::sum);
            }
        }
        return counts;
    }

    @Transactional
    public long markProductReviewsRead(User admin, Long productId) {
        if (!productRepo.existsById(productId)) {
            throw new ResourceNotFoundException("Product not found: " + productId);
        }
        for (Review review : reviewRepo.findByProductId(productId)) {
            if (!reviewReadRepo.existsByAdminIdAndReviewId(admin.getId(), review.getId())) {
                reviewReadRepo.save(new ReviewRead(admin, review));
            }
        }
        return getUnreadCount(admin);
    }

    @Transactional
    public long markAllReviewsRead(User admin) {
        for (Review review : reviewRepo.findAllByOrderByCreatedAtDesc()) {
            if (!reviewReadRepo.existsByAdminIdAndReviewId(admin.getId(), review.getId())) {
                reviewReadRepo.save(new ReviewRead(admin, review));
            }
        }
        return 0;
    }

    private boolean hasVerifiedPurchase(Long userId, Long productId) {
        return orderRepo.existsPurchasedProduct(userId, productId, RECEIVED_STATUSES);
    }

    private ReviewResponse toResponse(Review review) {
        return new ReviewResponse(review.getId(), review.getStars(), review.getComment(), review.getCreatedAt(),
                review.getUser().getId(), review.getUser().getName(), review.getProduct().getId(),
                review.getProduct().getName(), hasVerifiedPurchase(review.getUser().getId(), review.getProduct().getId()));
    }
}
