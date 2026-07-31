package dev.namphamcse.shopsflow.dto.response;

import java.time.Instant;

import dev.namphamcse.shopsflow.entity.enums.InventoryTransactionType;

public record InventoryTransactionResponse(
        Long id,
        Long productId,
        String productName,
        Integer quantityChange,
        InventoryTransactionType type,
        Long referenceId,
        String actorName,
        String note,
        Instant createdAt) {
}
