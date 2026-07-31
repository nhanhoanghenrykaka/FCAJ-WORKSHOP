package dev.namphamcse.shopsflow.mapper;

import dev.namphamcse.shopsflow.dto.response.ReviewResponse;
import dev.namphamcse.shopsflow.entity.Review;

public class ReviewMapper {
    private ReviewMapper() {}

    public static ReviewResponse toResponse(Review review) {
        return new ReviewResponse(
                review.getId(), review.getStars(), review.getComment(), review.getCreatedAt(),
                review.getUser().getId(), review.getUser().getName(),
                review.getProduct().getId(), review.getProduct().getName(), false);
    }
}
