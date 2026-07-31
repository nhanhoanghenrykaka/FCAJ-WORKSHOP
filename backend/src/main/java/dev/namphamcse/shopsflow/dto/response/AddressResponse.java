package dev.namphamcse.shopsflow.dto.response;

import java.time.Instant;

public record AddressResponse(
        Long id,
        String receiverName,
        String phone,
        String line1,
        String ward,
        String district,
        String province,
        boolean defaultAddress,
        Instant createdAt) {
}
