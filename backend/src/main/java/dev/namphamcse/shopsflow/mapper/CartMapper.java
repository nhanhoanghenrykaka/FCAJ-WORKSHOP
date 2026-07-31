package dev.namphamcse.shopsflow.mapper;

import java.math.BigDecimal;
import java.util.List;

import dev.namphamcse.shopsflow.dto.response.CartItemResponse;
import dev.namphamcse.shopsflow.dto.response.CartResponse;
import dev.namphamcse.shopsflow.entity.CartItem;
import dev.namphamcse.shopsflow.entity.Product;

public class CartMapper {
    private CartMapper () {}

    public static CartItemResponse toCartItemResponse(CartItem item) {
        Product p = item.getProduct();
        BigDecimal subtotal = p.getPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
        return new CartItemResponse(
            item.getId(),
            p.getId(),
            p.getName(),
            p.getImageUrl(),
            p.getStockQuantity(),
            p.getPrice(),
            item.getQuantity(),
            subtotal
        );
    }

    public static CartResponse toCartResponse(List<CartItem> items) {
        List<CartItemResponse> responses = items.stream()
                .map(CartMapper::toCartItemResponse)
                .toList();

        int totalItems = responses.stream()
                .mapToInt(CartItemResponse::getQuantity)
                .sum();

        BigDecimal totalPrice = responses.stream()
                .map(CartItemResponse::getSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new CartResponse(responses, totalItems, totalPrice);
    }
}
