package dev.namphamcse.shopsflow.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import dev.namphamcse.shopsflow.entity.ReviewRead;

public interface ReviewReadRepository extends JpaRepository<ReviewRead, Long> {
    boolean existsByAdminIdAndReviewId(Long adminId, Long reviewId);
    long countByAdminId(Long adminId);
    List<ReviewRead> findByAdminId(Long adminId);
    void deleteByReviewId(Long reviewId);
}
