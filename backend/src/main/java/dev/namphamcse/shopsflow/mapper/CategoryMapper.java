package dev.namphamcse.shopsflow.mapper;

import dev.namphamcse.shopsflow.dto.request.CategoryRequest;
import dev.namphamcse.shopsflow.dto.response.CategoryResponse;
import dev.namphamcse.shopsflow.entity.Category;

public class CategoryMapper {

    private CategoryMapper() {
    }

    public static Category toEntity(CategoryRequest request) {
        return new Category(request.getName());
    }

    public static void updateEntity(Category category, CategoryRequest request) {
        category.setName(request.getName());
    }

    public static CategoryResponse toResponse(Category category) {
        return new CategoryResponse(category.getId(), category.getName());
    }
}
