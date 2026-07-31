package dev.namphamcse.shopsflow.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ShipOrderRequest {
    @Size(max = 100)
    private String carrier;
    @Size(max = 150)
    private String trackingNumber;
}
