package dev.namphamcse.shopsflow.service;

import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.namphamcse.shopsflow.dto.request.CategoryRequest;
import dev.namphamcse.shopsflow.dto.response.CategoryResponse;
import dev.namphamcse.shopsflow.entity.Category;
import dev.namphamcse.shopsflow.exception.BusinessRuleViolationException;
import dev.namphamcse.shopsflow.exception.DuplicateResourceException;
import dev.namphamcse.shopsflow.exception.ResourceNotFoundException;
import dev.namphamcse.shopsflow.mapper.CategoryMapper;
import dev.namphamcse.shopsflow.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class CategoryService {
    private final CategoryRepository categoryRepo;

    public List<CategoryResponse> getAllCategories() {
        return categoryRepo.findAll(Sort.by(Sort.Direction.ASC, "name"))
                .stream()
                .map(CategoryMapper::toResponse)
                .toList();
    }

    public CategoryResponse getCategoryById(Long id) {
        Category category = categoryRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + id));
        return CategoryMapper.toResponse(category);
    }

    @Transactional
    public CategoryResponse createCategory(CategoryRequest request) {
        String name = request.getName().trim();
        if (categoryRepo.existsByNameIgnoreCase(name)) {
            throw new DuplicateResourceException("Category name already exists: " + name);
        }

        request.setName(name);
        Category saved = categoryRepo.save(CategoryMapper.toEntity(request));
        return CategoryMapper.toResponse(saved);
    }

    @Transactional
    public CategoryResponse updateCategory(Long id, CategoryRequest request) {
        Category category = categoryRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + id));
        String name = request.getName().trim();

        if (categoryRepo.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw new DuplicateResourceException("Category name already exists: " + name);
        }

        request.setName(name);
        CategoryMapper.updateEntity(category, request);
        return CategoryMapper.toResponse(categoryRepo.save(category));
    }

    @Transactional
    public void deleteCategory(Long id) {
        Category category = categoryRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + id));
        if (!category.getProducts().isEmpty()) {
            throw new BusinessRuleViolationException("Cannot delete a category that is assigned to products");
        }
        categoryRepo.delete(category);
    }
}
