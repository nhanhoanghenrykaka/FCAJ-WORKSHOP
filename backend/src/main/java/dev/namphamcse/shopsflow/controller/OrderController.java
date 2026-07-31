package dev.namphamcse.shopsflow.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import dev.namphamcse.shopsflow.dto.request.CheckoutRequest;
import dev.namphamcse.shopsflow.dto.request.ReturnRequest;
import dev.namphamcse.shopsflow.dto.request.ShipOrderRequest;
import dev.namphamcse.shopsflow.dto.request.UpdateOrderStatusRequest;
import dev.namphamcse.shopsflow.dto.response.OrderHistoryResponse;
import dev.namphamcse.shopsflow.dto.response.OrderResponse;
import dev.namphamcse.shopsflow.entity.User;
import dev.namphamcse.shopsflow.entity.enums.OrderStatus;
import dev.namphamcse.shopsflow.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {
    private final OrderService orderService;

    @PreAuthorize("hasRole('USER')")
    @PostMapping
    public ResponseEntity<OrderResponse> placeOrder(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody(required = false) CheckoutRequest request) {
        return ResponseEntity.ok(orderService.placeOrder(user, request));
    }

    @PreAuthorize("hasRole('USER')")
    @GetMapping
    public ResponseEntity<List<OrderResponse>> getUserOrders(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(orderService.getUserOrders(user));
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrderResponse> getOrderById(@AuthenticationPrincipal User user, @PathVariable Long id) {
        return ResponseEntity.ok(orderService.getOrderById(user, id));
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<List<OrderHistoryResponse>> getOrderHistory(@AuthenticationPrincipal User user, @PathVariable Long id) {
        return ResponseEntity.ok(orderService.getHistory(user, id));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}/status")
    public ResponseEntity<OrderResponse> updateStatus(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @Valid @RequestBody UpdateOrderStatusRequest req) {
        return ResponseEntity.ok(orderService.updateOrderStatusByAdmin(user, id, req.getStatus()));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}/ship")
    public ResponseEntity<OrderResponse> shipOrder(
            @AuthenticationPrincipal User admin,
            @PathVariable Long id,
            @Valid @RequestBody ShipOrderRequest request) {
        return ResponseEntity.ok(orderService.shipOrder(admin, id, request));
    }

    @PreAuthorize("hasRole('USER')")
    @PutMapping("/{id}/delivered")
    public ResponseEntity<OrderResponse> confirmDelivered(@AuthenticationPrincipal User user, @PathVariable Long id) {
        return ResponseEntity.ok(orderService.confirmDelivered(user, id));
    }

    @PreAuthorize("hasRole('USER')")
    @PostMapping("/{id}/return")
    public ResponseEntity<OrderResponse> requestReturn(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @Valid @RequestBody ReturnRequest request) {
        return ResponseEntity.ok(orderService.requestReturn(user, id, request));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}/return-status/{status}")
    public ResponseEntity<OrderResponse> processReturn(
            @AuthenticationPrincipal User admin,
            @PathVariable Long id,
            @PathVariable OrderStatus status) {
        return ResponseEntity.ok(orderService.processReturn(admin, id, status));
    }

    @PreAuthorize("hasRole('USER')")
    @PutMapping("/{id}/return-item")
    public ResponseEntity<OrderResponse> confirmItemReturned(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {
        return ResponseEntity.ok(orderService.confirmItemReturned(user, id));
    }

    @PreAuthorize("hasRole('USER')")
    @PutMapping("/{id}/refund-confirmed")
    public ResponseEntity<OrderResponse> confirmRefundReceived(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {
        return ResponseEntity.ok(orderService.confirmRefundReceived(user, id));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/all")
    public ResponseEntity<List<OrderResponse>> getAllOrders() {
        return ResponseEntity.ok(orderService.findAllOrders());
    }
}
