package dev.namphamcse.shopsflow.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import dev.namphamcse.shopsflow.entity.Review;

public interface ReviewRepository extends JpaRepository<Review, Long>{
    boolean existsByUserIdAndProductId(Long userId, Long productId);
    List<Review> findByProductId(Long productId);
    List<Review> findAllByOrderByCreatedAtDesc();
    void deleteByProductId(Long productId);
    long countByUserId(Long userId);
    long countByProductId(Long productId);
}
