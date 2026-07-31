package dev.namphamcse.shopsflow.dto.request;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import dev.namphamcse.shopsflow.entity.enums.DiscountType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CouponRequest {
    @NotBlank @Size(max = 100)
    private String code;
    @NotNull
    private DiscountType discountType;
    @NotNull @DecimalMin("0.01")
    private BigDecimal discountValue;
    @DecimalMin("0")
    private BigDecimal minimumOrder = BigDecimal.ZERO;
    private boolean active = true;
    private Instant startsAt;
    private Instant endsAt;
    @Positive
    private Integer usageLimit;
    @Positive
    private Integer perCustomerUsageLimit = 1;
    private boolean audienceAll = true;
    private List<Long> customerIds = new ArrayList<>();
}
