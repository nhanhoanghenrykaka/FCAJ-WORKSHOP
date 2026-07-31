package dev.namphamcse.shopsflow.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import dev.namphamcse.shopsflow.dto.request.CouponRequest;
import dev.namphamcse.shopsflow.dto.request.CustomerBanRequest;
import dev.namphamcse.shopsflow.dto.request.InventoryAdjustmentRequest;
import dev.namphamcse.shopsflow.dto.response.*;
import dev.namphamcse.shopsflow.entity.User;
import dev.namphamcse.shopsflow.service.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminOperationsController {
    private final AdminInsightsService insightsService;
    private final InventoryService inventoryService;
    private final CouponService couponService;
    private final AuditService auditService;
    private final AdminCustomerService adminCustomerService;

    @GetMapping("/dashboard")
    public ResponseEntity<AdminDashboardResponse> dashboard() {
        return ResponseEntity.ok(insightsService.dashboard());
    }

    @GetMapping("/customers")
    public ResponseEntity<List<CustomerSummaryResponse>> customers() {
        return ResponseEntity.ok(insightsService.customers());
    }


    @PutMapping("/customers/{customerId}/ban")
    public ResponseEntity<UserResponse> setCustomerBan(
            @AuthenticationPrincipal User admin,
            @PathVariable Long customerId,
            @Valid @RequestBody CustomerBanRequest request) {
        return ResponseEntity.ok(adminCustomerService.setBanned(admin, customerId, request.isBanned(), request.getReason()));
    }

    @GetMapping("/inventory")
    public ResponseEntity<List<InventoryTransactionResponse>> inventory() {
        return ResponseEntity.ok(inventoryService.getAll());
    }

    @GetMapping("/inventory/{productId}")
    public ResponseEntity<List<InventoryTransactionResponse>> productInventory(@PathVariable Long productId) {
        return ResponseEntity.ok(inventoryService.getForProduct(productId));
    }

    @PostMapping("/inventory/{productId}/adjust")
    public ResponseEntity<InventoryTransactionResponse> adjustInventory(
            @AuthenticationPrincipal User admin,
            @PathVariable Long productId,
            @Valid @RequestBody InventoryAdjustmentRequest request) {
        return ResponseEntity.ok(inventoryService.adjust(admin, productId, request));
    }

    @GetMapping("/coupons")
    public ResponseEntity<List<CouponResponse>> coupons() {
        return ResponseEntity.ok(couponService.getAll());
    }

    @PostMapping("/coupons")
    public ResponseEntity<CouponResponse> createCoupon(@AuthenticationPrincipal User admin,
                                                        @Valid @RequestBody CouponRequest request) {
        return ResponseEntity.ok(couponService.create(admin, request));
    }

    @PutMapping("/coupons/{id}")
    public ResponseEntity<CouponResponse> updateCoupon(@AuthenticationPrincipal User admin,
                                                        @PathVariable Long id,
                                                        @Valid @RequestBody CouponRequest request) {
        return ResponseEntity.ok(couponService.update(admin, id, request));
    }

    @DeleteMapping("/coupons/{id}")
    public ResponseEntity<Void> deleteCoupon(@AuthenticationPrincipal User admin, @PathVariable Long id) {
        couponService.delete(admin, id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/audit")
    public ResponseEntity<List<AuditLogResponse>> audit() {
        return ResponseEntity.ok(auditService.getRecent());
    }
}
