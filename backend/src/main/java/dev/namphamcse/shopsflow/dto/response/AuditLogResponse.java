package dev.namphamcse.shopsflow.dto.response;

import java.time.Instant;

import dev.namphamcse.shopsflow.entity.enums.Role;

public record AuditLogResponse(
        Long id,
        Long actorUserId,
        String actorName,
        Role actorRole,
        String action,
        String entityType,
        Long entityId,
        String details,
        Instant createdAt) {
}
