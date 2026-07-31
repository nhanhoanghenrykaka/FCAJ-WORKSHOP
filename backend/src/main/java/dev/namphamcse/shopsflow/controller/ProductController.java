package dev.namphamcse.shopsflow.controller;

import java.math.BigDecimal;
import java.net.URI;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import dev.namphamcse.shopsflow.dto.request.ProductRequest;
import dev.namphamcse.shopsflow.dto.response.ProductResponse;
import dev.namphamcse.shopsflow.entity.User;
import dev.namphamcse.shopsflow.entity.enums.NotificationType;
import dev.namphamcse.shopsflow.entity.enums.Role;
import dev.namphamcse.shopsflow.service.NotificationService;
import dev.namphamcse.shopsflow.service.InventoryService;
import dev.namphamcse.shopsflow.service.AuditService;
import dev.namphamcse.shopsflow.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {
    private final ProductService productService;
    private final NotificationService notificationService;
    private final AuditService auditService;
    private final InventoryService inventoryService;

    @GetMapping
    public ResponseEntity<Page<ProductResponse>> searchProducts(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            Pageable pageable) {
        return ResponseEntity.ok(productService.searchProducts(keyword, categoryId,
                minPrice, maxPrice, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductResponse> getProductById(@PathVariable Long id) {
        return ResponseEntity.ok(productService.getProductById(id));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<ProductResponse> createProduct(
            @AuthenticationPrincipal User admin,
            @Valid @RequestBody ProductRequest req) {
        ProductResponse created = productService.createProduct(req);
        notificationService.notifyRole(
                Role.ADMIN, admin, NotificationType.PRODUCT,
                "Product created",
                admin.getName() + " created product " + created.getName() + ".",
                "/admin");
        notificationService.notifyRole(
                Role.USER, admin, NotificationType.PRODUCT,
                "New product available",
                created.getName() + " was added to the Shopsflow catalog.",
                "/products/" + created.getId());
        inventoryService.recordInitialStock(admin, created.getId());
        auditService.log(admin, "PRODUCT_CREATED", "PRODUCT", created.getId(), created.getName());
        return ResponseEntity
                .created(URI.create("/api/products/" + created.getId()))
                .body(created);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<ProductResponse> updateProduct(
            @AuthenticationPrincipal User admin,
            @PathVariable Long id,
            @Valid @RequestBody ProductRequest req) {
        ProductResponse before = productService.getProductById(id);
        ProductResponse updated = productService.updateProduct(id, req);
        notificationService.notifyRole(
                Role.ADMIN, admin, NotificationType.PRODUCT,
                "Product updated",
                admin.getName() + " updated product " + updated.getName() + ".",
                "/admin");
        notificationService.notifyRole(
                Role.USER, admin, NotificationType.PRODUCT,
                "Product updated",
                updated.getName() + " has new catalog information.",
                "/products/" + updated.getId());
        inventoryService.recordProductStockEdit(admin, updated.getId(), before.getStockQuantity(), updated.getStockQuantity());
        auditService.log(admin, "PRODUCT_UPDATED", "PRODUCT", updated.getId(), updated.getName());
        return ResponseEntity.ok(updated);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(
            @AuthenticationPrincipal User admin,
            @PathVariable Long id) {
        ProductResponse existing = productService.getProductById(id);
        productService.deleteProduct(id);
        notificationService.notifyRole(
                Role.ADMIN, admin, NotificationType.PRODUCT,
                "Product deleted",
                admin.getName() + " deleted product " + existing.getName() + ".",
                "/admin");
        notificationService.notifyRole(
                Role.USER, admin, NotificationType.PRODUCT,
                "Product removed",
                existing.getName() + " is no longer available in the catalog.",
                "/catalog");
        auditService.log(admin, "PRODUCT_DELETED", "PRODUCT", id, existing.getName());
        return ResponseEntity.noContent().build();
    }
}
