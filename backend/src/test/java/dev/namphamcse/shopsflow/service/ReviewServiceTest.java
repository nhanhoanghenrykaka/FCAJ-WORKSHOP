package dev.namphamcse.shopsflow.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import dev.namphamcse.shopsflow.dto.request.ReviewRequest;
import dev.namphamcse.shopsflow.dto.response.ReviewResponse;
import dev.namphamcse.shopsflow.entity.Product;
import dev.namphamcse.shopsflow.entity.Review;
import dev.namphamcse.shopsflow.entity.User;
import dev.namphamcse.shopsflow.exception.BusinessRuleViolationException;
import dev.namphamcse.shopsflow.exception.ResourceNotFoundException;
import dev.namphamcse.shopsflow.repository.ProductRepository;
import dev.namphamcse.shopsflow.repository.OrderRepository;
import dev.namphamcse.shopsflow.repository.ReviewRepository;
import dev.namphamcse.shopsflow.repository.ReviewReadRepository;

@ExtendWith(MockitoExtension.class)
class ReviewServiceTest {

    @Mock
    ReviewRepository reviewRepo;
    @Mock
    ReviewReadRepository reviewReadRepo;
    @Mock
    ProductRepository productRepo;

    @Mock
    NotificationService notificationService;
    @Mock
    OrderRepository orderRepo;
    @Mock
    AuditService auditService;

    @InjectMocks
    ReviewService reviewService;

    private User user;
    private User otherUser;
    private Product product;

    @BeforeEach
    void setUp() {
        user = new User("Nam", "n@x.com", "pw");
        user.setId(1L);

        otherUser = new User("Other", "o@x.com", "pw");
        otherUser.setId(2L);

        product = new Product("Book", "desc", new BigDecimal("10"), null, 5);
        product.setId(100L);
    }

    @Test
    void createReview_throws_whenUserAlreadyReviewedProduct() {
        ReviewRequest req = buildRequest(5, "Great");
        when(reviewRepo.existsByUserIdAndProductId(1L, 100L)).thenReturn(true);

        assertThrows(BusinessRuleViolationException.class,
                () -> reviewService.createReview(user, 100L, req));

        verify(productRepo, never()).findById(any());
        verify(reviewRepo, never()).save(any());
    }

    @Test
    void createReview_throws_whenProductNotFound() {
        ReviewRequest req = buildRequest(5, "Great");
        when(reviewRepo.existsByUserIdAndProductId(1L, 100L)).thenReturn(false);
        when(productRepo.findById(100L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> reviewService.createReview(user, 100L, req));

        verify(reviewRepo, never()).save(any());
    }

    @Test
    void createReview_savesAndReturnsResponse_whenHappyPath() {
        ReviewRequest req = buildRequest(5, "Great");
        when(reviewRepo.existsByUserIdAndProductId(1L, 100L)).thenReturn(false);
        when(productRepo.findById(100L)).thenReturn(Optional.of(product));
        when(orderRepo.existsPurchasedProduct(eq(1L), eq(100L), any())).thenReturn(true);
        when(reviewRepo.save(any(Review.class))).thenAnswer(inv -> {
            Review review = inv.getArgument(0);
            review.setId(50L);
            return review;
        });

        ReviewResponse response = reviewService.createReview(user, 100L, req);

        ArgumentCaptor<Review> captor = ArgumentCaptor.forClass(Review.class);
        verify(reviewRepo).save(captor.capture());
        assertSame(user, captor.getValue().getUser());
        assertSame(product, captor.getValue().getProduct());
        assertEquals(5, captor.getValue().getStars());
        assertEquals("Great", captor.getValue().getComment());

        assertEquals(50L, response.getId());
        assertEquals(5, response.getStars());
        assertEquals("Great", response.getComment());
        assertEquals(1L, response.getUserId());
        assertEquals("Nam", response.getUserName());
        assertEquals(100L, response.getProductId());
        assertEquals("Book", response.getProductName());
    }

    @Test
    void editReview_throws_whenReviewNotFound() {
        ReviewRequest req = buildRequest(4, "Updated");
        when(reviewRepo.findById(50L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> reviewService.editReview(user, 50L, req));
    }

    @Test
    void editReview_throws_whenReviewBelongsToAnotherUser() {
        ReviewRequest req = buildRequest(4, "Updated");
        Review review = new Review(otherUser, product, 5, "Old");
        review.setId(50L);
        when(reviewRepo.findById(50L)).thenReturn(Optional.of(review));

        assertThrows(BusinessRuleViolationException.class,
                () -> reviewService.editReview(user, 50L, req));

        assertEquals(5, review.getStars());
        assertEquals("Old", review.getComment());
    }

    @Test
    void editReview_updatesAndReturnsResponse_whenHappyPath() {
        ReviewRequest req = buildRequest(4, "Updated");
        Review review = new Review(user, product, 5, "Old");
        review.setId(50L);
        when(reviewRepo.findById(50L)).thenReturn(Optional.of(review));

        ReviewResponse response = reviewService.editReview(user, 50L, req);

        assertEquals(4, review.getStars());
        assertEquals("Updated", review.getComment());
        assertEquals(50L, response.getId());
        assertEquals(4, response.getStars());
        assertEquals("Updated", response.getComment());
        assertEquals(1L, response.getUserId());
        verify(reviewRepo, never()).save(any());
    }

    @Test
    void getProductReviews_throws_whenProductNotFound() {
        when(productRepo.existsById(100L)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class,
                () -> reviewService.getProductReviews(100L));

        verify(reviewRepo, never()).findByProductId(any());
    }

    @Test
    void getProductReviews_returnsMappedReviews_whenProductExists() {
        Review review1 = new Review(user, product, 5, "Great");
        review1.setId(50L);
        Review review2 = new Review(otherUser, product, 3, "Okay");
        review2.setId(51L);

        when(productRepo.existsById(100L)).thenReturn(true);
        when(reviewRepo.findByProductId(100L)).thenReturn(List.of(review1, review2));

        List<ReviewResponse> result = reviewService.getProductReviews(100L);

        assertEquals(2, result.size());
        assertEquals(50L, result.get(0).getId());
        assertEquals("Nam", result.get(0).getUserName());
        assertEquals(51L, result.get(1).getId());
        assertEquals("Other", result.get(1).getUserName());
        verify(reviewRepo).findByProductId(100L);
    }

    @Test
    void getAllReviews_returnsNewestFirstFromRepository() {
        Review review1 = new Review(user, product, 5, "Great");
        review1.setId(51L);
        Review review2 = new Review(otherUser, product, 4, "Good");
        review2.setId(50L);

        when(reviewRepo.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(review1, review2));

        List<ReviewResponse> result = reviewService.getAllReviews();

        assertEquals(2, result.size());
        assertEquals(51L, result.get(0).getId());
        assertEquals("Nam", result.get(0).getUserName());
        assertEquals(100L, result.get(0).getProductId());
        assertEquals("Book", result.get(0).getProductName());
        verify(reviewRepo).findAllByOrderByCreatedAtDesc();
    }

    @Test
    void deleteReview_throws_whenReviewNotFound() {
        when(reviewRepo.findById(50L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> reviewService.deleteReview(user, 50L));

        verify(reviewRepo, never()).delete(any());
    }

    @Test
    void deleteReview_throws_whenReviewBelongsToAnotherUser() {
        Review review = new Review(otherUser, product, 5, "Old");
        review.setId(50L);
        when(reviewRepo.findById(50L)).thenReturn(Optional.of(review));

        assertThrows(BusinessRuleViolationException.class,
                () -> reviewService.deleteReview(user, 50L));

        verify(reviewRepo, never()).delete(any());
    }

    @Test
    void deleteReview_deletes_whenHappyPath() {
        Review review = new Review(user, product, 5, "Great");
        review.setId(50L);
        when(reviewRepo.findById(50L)).thenReturn(Optional.of(review));

        reviewService.deleteReview(user, 50L);

        verify(reviewRepo).delete(review);
    }

    private ReviewRequest buildRequest(Integer stars, String comment) {
        ReviewRequest req = new ReviewRequest();
        req.setStars(stars);
        req.setComment(comment);
        return req;
    }
}
