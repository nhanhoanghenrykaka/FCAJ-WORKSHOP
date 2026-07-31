package dev.namphamcse.shopsflow.dto.response;

import java.time.Instant;
import java.util.List;

import dev.namphamcse.shopsflow.entity.enums.SupportTicketStatus;

public record SupportTicketResponse(
        Long id,
        Long userId,
        String userName,
        String userEmail,
        Long orderId,
        Long categoryId,
        String categoryName,
        Long productId,
        String productName,
        String subject,
        SupportTicketStatus status,
        Instant createdAt,
        Instant updatedAt,
        List<SupportMessageResponse> messages) {
}
