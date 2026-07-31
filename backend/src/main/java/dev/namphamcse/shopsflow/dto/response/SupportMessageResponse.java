package dev.namphamcse.shopsflow.dto.response;

import java.time.Instant;

import dev.namphamcse.shopsflow.entity.enums.Role;

public record SupportMessageResponse(
        Long id,
        Long senderId,
        String senderName,
        Role senderRole,
        String message,
        Instant createdAt) {
}
