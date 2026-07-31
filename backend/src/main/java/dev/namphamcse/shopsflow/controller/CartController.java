package dev.namphamcse.shopsflow.controller;


import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.namphamcse.shopsflow.dto.request.AddToCartRequest;
import dev.namphamcse.shopsflow.dto.request.UpdateCartItemRequest;
import dev.namphamcse.shopsflow.dto.response.CartResponse;
import dev.namphamcse.shopsflow.entity.User;
import dev.namphamcse.shopsflow.service.CartService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {
    private final CartService cartService;

    @GetMapping
    public ResponseEntity<CartResponse> getCart(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(cartService.getCart(user));
    }

    @PostMapping("/items")
    public ResponseEntity<CartResponse> addToCart(@AuthenticationPrincipal User user, 
        @Valid @RequestBody AddToCartRequest req) {
            return ResponseEntity.ok(cartService.addToCart(user, req));
    }

    @PutMapping("/items/{itemId}")
    public ResponseEntity<CartResponse> updateItem(@AuthenticationPrincipal User user,
        @PathVariable Long itemId, @Valid @RequestBody UpdateCartItemRequest req) {
            return ResponseEntity.ok(cartService.updateItem(user, itemId, req));
    }

    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<CartResponse> removeItem(@AuthenticationPrincipal User user,
        @PathVariable Long itemId) {
            return ResponseEntity.ok(cartService.removeItem(user, itemId));
    }
}
