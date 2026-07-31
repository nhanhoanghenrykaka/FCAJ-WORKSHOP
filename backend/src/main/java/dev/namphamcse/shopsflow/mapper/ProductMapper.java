package dev.namphamcse.shopsflow.mapper;

import java.util.List;

import dev.namphamcse.shopsflow.dto.request.ProductRequest;
import dev.namphamcse.shopsflow.dto.response.CategorySummary;
import dev.namphamcse.shopsflow.dto.response.ProductResponse;
import dev.namphamcse.shopsflow.entity.Category;
import dev.namphamcse.shopsflow.entity.Product;

public class ProductMapper {

    private ProductMapper() {
    }

    public static Product toEntity(ProductRequest request, List<Category> categories) {
        Product product = new Product(
                request.getName(),
                request.getDescription(),
                request.getPrice(),
                request.getImageUrl(),
                request.getStockQuantity());
        product.setCategories(categories);
        return product;
    }

    public static void updateEntity(Product product, ProductRequest request,
            List<Category> categories) {
        product.setName(request.getName());
        product.setDescription(request.getDescription());
        product.setPrice(request.getPrice());
        product.setImageUrl(request.getImageUrl());
        product.setStockQuantity(request.getStockQuantity());
        product.setCategories(categories);
    }

    public static ProductResponse toResponse(Product product) {
        List<CategorySummary> categories = product.getCategories()
                .stream()
                .map(c -> new CategorySummary(c.getId(), c.getName()))
                .toList();
        return ProductResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .description(product.getDescription())
                .price(product.getPrice())
                .imageUrl(product.getImageUrl())
                .stockQuantity(product.getStockQuantity())
                .createdAt(product.getCreatedAt())
                .categories(categories)
                .build();
    }
}
