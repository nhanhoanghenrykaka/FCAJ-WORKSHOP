package dev.namphamcse.shopsflow.dto.response;

import java.math.BigDecimal;
import java.time.Instant;

public record CustomerSummaryResponse(
        Long id,
        String name,
        String email,
        String phone,
        String profileImageUrl,
        boolean banned,
        String bannedReason,
        Instant createdAt,
        long orderCount,
        BigDecimal totalSpent,
        long reviewCount) {
}
