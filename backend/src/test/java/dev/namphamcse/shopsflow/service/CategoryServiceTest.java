package dev.namphamcse.shopsflow.service;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Sort;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import dev.namphamcse.shopsflow.dto.request.CategoryRequest;
import dev.namphamcse.shopsflow.dto.response.CategoryResponse;
import dev.namphamcse.shopsflow.entity.Category;
import dev.namphamcse.shopsflow.entity.Product;
import dev.namphamcse.shopsflow.exception.BusinessRuleViolationException;
import dev.namphamcse.shopsflow.exception.DuplicateResourceException;
import dev.namphamcse.shopsflow.exception.ResourceNotFoundException;
import dev.namphamcse.shopsflow.repository.CategoryRepository;

@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {
    @Mock
    CategoryRepository categoryRepo;
    @InjectMocks
    CategoryService categoryService;

    @Test
    void getAllCategories_returnsEmptyList_whenEmpty() {
        when(categoryRepo.findAll(any(Sort.class))).thenReturn(List.of());
        assertTrue(categoryService.getAllCategories().isEmpty());
    }

    @Test
    void getAllCategories_returns_whenNotEmpty() {
        when(categoryRepo.findAll(any(Sort.class))).thenReturn(List.of(new Category()));
        assertTrue(!categoryService.getAllCategories().isEmpty());
    }

    @Test
    void getCategoryById_returnCategory_whenFound() {
        Category cat = new Category();
        cat.setId(1L);
        cat.setName("Books");

        when(categoryRepo.findById(1L)).thenReturn(Optional.of(cat));

        CategoryResponse result = categoryService.getCategoryById(1L);

        assertEquals(1L, result.getId());
        assertEquals("Books", result.getName());
    }

    @Test
    void getCategoryById_throws_whenNotFound() {
        when(categoryRepo.findById(999L)).thenReturn(Optional.empty());

        ResourceNotFoundException ex = assertThrows(
                ResourceNotFoundException.class,
                () -> categoryService.getCategoryById(999L));

        assertTrue(ex.getMessage().contains("999"));
    }

    @Test
    void createCategory_throws_whenNameExists() {
        CategoryRequest req = new CategoryRequest();
        req.setName("Books");

        when(categoryRepo.existsByNameIgnoreCase("Books")).thenReturn(true);

        assertThrows(
                DuplicateResourceException.class,
                () -> categoryService.createCategory(req));

        verify(categoryRepo, never()).save(any());
    }

    @Test
    void createCategory_savesAndReturns_whenNameIsNew() {
        CategoryRequest req = new CategoryRequest();
        req.setName("Books");

        when(categoryRepo.existsByNameIgnoreCase("Books")).thenReturn(false);
        when(categoryRepo.save(any(Category.class)))
                .thenAnswer(inv -> {
                    Category c = inv.getArgument(0);
                    c.setId(42L);
                    return c;
                });
        
        CategoryResponse result = categoryService.createCategory(req);

        assertEquals(42L, result.getId());
        assertEquals("Books", result.getName());

        ArgumentCaptor<Category> captor = ArgumentCaptor.forClass(Category.class);
        verify(categoryRepo).save(captor.capture());
        assertEquals("Books", captor.getValue().getName());
    }

    @Test
    void updateCategory_updatesAndReturns_whenFound() {
        CategoryRequest req = new CategoryRequest();
        req.setName("Electronics");

        Category cat = new Category();
        cat.setId(1L);
        cat.setName("Books");

        when(categoryRepo.findById(1L)).thenReturn(Optional.of(cat));
        when(categoryRepo.save(any(Category.class))).thenReturn(cat);

        CategoryResponse result = categoryService.updateCategory(1L, req);
        assertEquals("Electronics", result.getName());

        ArgumentCaptor<Category> captor = ArgumentCaptor.forClass(Category.class);
        verify(categoryRepo).save(captor.capture());
        assertEquals("Electronics", captor.getValue().getName());
    }

    @Test
    void updateCategory_throws_whenNotFound() {
        CategoryRequest req = new CategoryRequest();
        req.setName("Electronics");

        when(categoryRepo.findById(999L)).thenReturn(Optional.empty());


        assertThrows(ResourceNotFoundException.class,
            () -> categoryService.updateCategory(999L, req));
        verify(categoryRepo, never()).save(any());
    }

    @Test
    void deleteCategory_throws_whenCategoryHasProducts() {
        Category cat = new Category();
        cat.setId(1L);
        cat.setProducts(List.of(new Product()));

        when(categoryRepo.findById(1L)).thenReturn(Optional.of(cat));
        assertThrows(BusinessRuleViolationException.class,
            () -> categoryService.deleteCategory(1L)
        );

        verify(categoryRepo, never()).delete(any());

    }

    @Test
    void deleteCategory_throws_whenNotFound() {
        when(categoryRepo.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
            () -> categoryService.deleteCategory(999L));

        verify(categoryRepo, never()).delete(any());
    }

    @Test
    void deleteCategory_deletes_whenNoProducts() {
        Category cat = new Category();
        cat.setId(1L);
        cat.setProducts(List.of());

        when(categoryRepo.findById(1L)).thenReturn(Optional.of(cat));

        categoryService.deleteCategory(1L);

        verify(categoryRepo).delete(cat);
    }

}
