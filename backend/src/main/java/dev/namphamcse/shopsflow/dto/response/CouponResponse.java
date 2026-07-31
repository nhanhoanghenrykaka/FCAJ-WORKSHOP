package dev.namphamcse.shopsflow.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import dev.namphamcse.shopsflow.entity.enums.DiscountType;

public record CouponResponse(
        Long id,
        String code,
        DiscountType discountType,
        BigDecimal discountValue,
        BigDecimal minimumOrder,
        boolean active,
        Instant startsAt,
        Instant endsAt,
        Integer usageLimit,
        Integer perCustomerUsageLimit,
        Integer usedCount,
        boolean audienceAll,
        List<Long> customerIds,
        Instant createdAt) {
}
