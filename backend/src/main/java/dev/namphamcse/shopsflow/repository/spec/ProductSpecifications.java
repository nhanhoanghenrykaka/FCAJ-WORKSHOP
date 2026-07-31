package dev.namphamcse.shopsflow.repository.spec;

import java.math.BigDecimal;

import org.springframework.data.jpa.domain.Specification;

import dev.namphamcse.shopsflow.entity.Category;
import dev.namphamcse.shopsflow.entity.Product;
import jakarta.persistence.criteria.Join;

public class ProductSpecifications {

    private ProductSpecifications() {}

    public static Specification<Product> hasKeyword(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return null;
        }

        String like = "%" + keyword.toLowerCase() + "%";
        return (root, query, cb) -> cb.or(
                cb.like(cb.lower(root.get("name")), like),
                cb.like(cb.lower(root.get("description")), like));
    }

    public static Specification<Product> inCategory(Long categoryId) {
        if (categoryId == null) return null;
        return (root, query, cb) -> {
            Join<Product, Category> join = root.join("categories");
            return cb.equal(join.get("id"), categoryId);
        };
    }

    public static Specification<Product> priceAtLeast(BigDecimal minPrice) {
        if (minPrice == null) return null;
        return (root, query, cb) -> cb.greaterThanOrEqualTo(
            root.get("price"), minPrice
        );
    }

    public static Specification<Product> priceAtMost(BigDecimal maxPrice) {
        if (maxPrice == null) return null;
        return (root, query, cb) -> cb.lessThanOrEqualTo(
            root.get("price"), maxPrice
        );
    }

}
