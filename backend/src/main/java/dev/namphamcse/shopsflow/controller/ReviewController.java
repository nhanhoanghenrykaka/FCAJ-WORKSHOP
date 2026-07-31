package dev.namphamcse.shopsflow.controller;

import java.net.URI;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.namphamcse.shopsflow.dto.request.ReviewRequest;
import dev.namphamcse.shopsflow.dto.response.ReviewResponse;
import dev.namphamcse.shopsflow.entity.User;
import dev.namphamcse.shopsflow.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ReviewController {
    private final ReviewService reviewService;

    @GetMapping("/products/{productId}/reviews")
    public ResponseEntity<List<ReviewResponse>> getProductReviews(@PathVariable Long productId) {
        return ResponseEntity.ok(reviewService.getProductReviews(productId));
    }

    @GetMapping("/admin/reviews")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ReviewResponse>> getAllReviewsForAdmin() {
        return ResponseEntity.ok(reviewService.getAllReviews());
    }

    @GetMapping("/admin/reviews/unread-count")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Long>> getUnreadReviewCount(@AuthenticationPrincipal User admin) {
        return ResponseEntity.ok(Map.of("unreadCount", reviewService.getUnreadCount(admin)));
    }

    @GetMapping("/admin/reviews/unread-by-product")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<Long, Long>> getUnreadReviewCountsByProduct(@AuthenticationPrincipal User admin) {
        return ResponseEntity.ok(reviewService.getUnreadCountsByProduct(admin));
    }

    @PutMapping("/admin/reviews/product/{productId}/read")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Long>> markProductReviewsRead(
            @AuthenticationPrincipal User admin,
            @PathVariable Long productId) {
        return ResponseEntity.ok(Map.of("unreadCount", reviewService.markProductReviewsRead(admin, productId)));
    }

    @PutMapping("/admin/reviews/read-all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Long>> markAllReviewsRead(@AuthenticationPrincipal User admin) {
        return ResponseEntity.ok(Map.of("unreadCount", reviewService.markAllReviewsRead(admin)));
    }

    @PreAuthorize("hasRole('USER')")
    @PostMapping("/products/{productId}/reviews")
    public ResponseEntity<ReviewResponse> createReview(
            @AuthenticationPrincipal User user,
            @PathVariable Long productId,
            @Valid @RequestBody ReviewRequest req) {
        ReviewResponse created = reviewService.createReview(user, productId, req);
        return ResponseEntity
                .created(URI.create("/api/reviews/" + created.getId()))
                .body(created);
    }

    @PreAuthorize("hasRole('USER')")
    @PutMapping("/reviews/{reviewId}")
    public ResponseEntity<ReviewResponse> editReview(
            @AuthenticationPrincipal User user,
            @PathVariable Long reviewId,
            @Valid @RequestBody ReviewRequest req) {
        return ResponseEntity.ok(reviewService.editReview(user, reviewId, req));
    }

    @PreAuthorize("hasRole('USER')")
    @DeleteMapping("/reviews/{reviewId}")
    public ResponseEntity<Void> deleteReview(
            @AuthenticationPrincipal User user,
            @PathVariable Long reviewId) {
        reviewService.deleteReview(user, reviewId);
        return ResponseEntity.noContent().build();
    }
}
