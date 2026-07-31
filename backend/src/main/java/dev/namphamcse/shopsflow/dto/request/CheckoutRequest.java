package dev.namphamcse.shopsflow.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CheckoutRequest {
    @NotNull
    private Long addressId;
    private String shippingMethod = "STANDARD";
    private String couponCode;
}
