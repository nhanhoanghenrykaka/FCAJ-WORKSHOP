package dev.namphamcse.shopsflow.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import dev.namphamcse.shopsflow.entity.enums.OrderStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class OrderResponse {
    private Long id;
    private OrderStatus status;
    private BigDecimal totalAmount;
    private BigDecimal shippingFee;
    private BigDecimal discountAmount;
    private String shippingMethod;
    private String shippingAddress;
    private String receiverName;
    private String receiverPhone;
    private String carrier;
    private String trackingNumber;
    private String couponCode;
    private String returnReason;
    private Integer totalItems;
    private Instant createdAt;
    private Long userId;
    private String userName;
    private String userEmail;
    private String vnpayTransId;
    private List<OrderItemResponse> items;
}
