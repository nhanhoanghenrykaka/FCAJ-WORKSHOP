package dev.namphamcse.shopsflow.controller;

import java.net.URI;
import java.util.List;

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

import dev.namphamcse.shopsflow.dto.request.CategoryRequest;
import dev.namphamcse.shopsflow.dto.response.CategoryResponse;
import dev.namphamcse.shopsflow.entity.User;
import dev.namphamcse.shopsflow.entity.enums.NotificationType;
import dev.namphamcse.shopsflow.entity.enums.Role;
import dev.namphamcse.shopsflow.service.CategoryService;
import dev.namphamcse.shopsflow.service.NotificationService;
import dev.namphamcse.shopsflow.service.AuditService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {
    private final CategoryService categoryService;
    private final NotificationService notificationService;
    private final AuditService auditService;

    @GetMapping
    public ResponseEntity<List<CategoryResponse>> getAllCategories() {
        return ResponseEntity.ok(categoryService.getAllCategories());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CategoryResponse> getCategoryById(@PathVariable Long id) {
        return ResponseEntity.ok(categoryService.getCategoryById(id));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<CategoryResponse> createCategory(
            @AuthenticationPrincipal User admin,
            @Valid @RequestBody CategoryRequest req) {
        CategoryResponse created = categoryService.createCategory(req);
        notificationService.notifyRole(
                Role.ADMIN, admin, NotificationType.CATEGORY,
                "Category created",
                admin.getName() + " created category " + created.getName() + ".",
                "/admin");
        notificationService.notifyRole(
                Role.USER, admin, NotificationType.CATEGORY,
                "New category available",
                "A new catalog category, " + created.getName() + ", is now available.",
                "/catalog");
        auditService.log(admin, "CATEGORY_CREATED", "CATEGORY", created.getId(), created.getName());
        return ResponseEntity
            .created(URI.create("/api/categories/" + created.getId()))
            .body(created);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<CategoryResponse> updateCategory(
            @AuthenticationPrincipal User admin,
            @PathVariable Long id,
            @Valid @RequestBody CategoryRequest req) {
        CategoryResponse updated = categoryService.updateCategory(id, req);
        notificationService.notifyRole(
                Role.ADMIN, admin, NotificationType.CATEGORY,
                "Category updated",
                admin.getName() + " updated category " + updated.getName() + ".",
                "/admin");
        notificationService.notifyRole(
                Role.USER, admin, NotificationType.CATEGORY,
                "Category updated",
                "Catalog category " + updated.getName() + " was updated.",
                "/catalog");
        auditService.log(admin, "CATEGORY_UPDATED", "CATEGORY", updated.getId(), updated.getName());
        return ResponseEntity.ok(updated);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCategory(
            @AuthenticationPrincipal User admin,
            @PathVariable Long id) {
        CategoryResponse existing = categoryService.getCategoryById(id);
        categoryService.deleteCategory(id);
        notificationService.notifyRole(
                Role.ADMIN, admin, NotificationType.CATEGORY,
                "Category deleted",
                admin.getName() + " deleted category " + existing.getName() + ".",
                "/admin");
        notificationService.notifyRole(
                Role.USER, admin, NotificationType.CATEGORY,
                "Category removed",
                "Catalog category " + existing.getName() + " was removed.",
                "/catalog");
        auditService.log(admin, "CATEGORY_DELETED", "CATEGORY", id, existing.getName());
        return ResponseEntity.noContent().build();
    }
}
