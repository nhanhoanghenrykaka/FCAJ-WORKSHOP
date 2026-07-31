package dev.namphamcse.shopsflow.dto.response;

import java.math.BigDecimal;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CartItemResponse {
    private Long itemId;
    private Long productId;
    private String productName;
    private String imageUrl;
    private Integer stockQuantity;
    private BigDecimal unitPrice;
    private Integer quantity;
    private BigDecimal subtotal;
}
