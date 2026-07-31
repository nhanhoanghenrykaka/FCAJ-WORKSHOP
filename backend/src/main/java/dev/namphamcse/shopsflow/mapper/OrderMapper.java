package dev.namphamcse.shopsflow.mapper;

import java.math.BigDecimal;
import java.util.List;

import dev.namphamcse.shopsflow.dto.response.OrderItemResponse;
import dev.namphamcse.shopsflow.dto.response.OrderResponse;
import dev.namphamcse.shopsflow.entity.Order;
import dev.namphamcse.shopsflow.entity.OrderItem;
import dev.namphamcse.shopsflow.entity.User;

public class OrderMapper {
    private OrderMapper() {}

    public static OrderItemResponse toOrderItemResponse(OrderItem item) {
        BigDecimal subtotal = item.getPriceAtPurchase().multiply(BigDecimal.valueOf(item.getQuantity()));
        return new OrderItemResponse(item.getProduct().getId(), item.getProduct().getName(), item.getQuantity(),
                item.getPriceAtPurchase(), subtotal);
    }

    public static OrderResponse toOrderResponse(Order order) {
        List<OrderItemResponse> itemResponses = order.getItems().stream().map(OrderMapper::toOrderItemResponse).toList();
        int totalItems = itemResponses.stream().mapToInt(OrderItemResponse::getQuantity).sum();
        User user = order.getUser();
        return new OrderResponse(
                order.getId(), order.getStatus(), order.getTotalAmount(), order.getShippingFee(), order.getDiscountAmount(),
                order.getShippingMethod(), order.getShippingAddress(), order.getReceiverName(), order.getReceiverPhone(),
                order.getCarrier(), order.getTrackingNumber(), order.getCouponCode(), order.getReturnReason(), totalItems,
                order.getCreatedAt(), user.getId(), user.getName(), user.getEmail(), order.getVnpayTransId(), itemResponses);
    }
}
