package dev.namphamcse.shopsflow.dto.response;

import java.time.Instant;

import dev.namphamcse.shopsflow.entity.enums.OrderStatus;

public record OrderHistoryResponse(
        Long id,
        OrderStatus fromStatus,
        OrderStatus toStatus,
        String changedByName,
        String note,
        Instant createdAt) {
}
