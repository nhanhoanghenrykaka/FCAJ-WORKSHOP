package dev.namphamcse.shopsflow.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class InventoryAdjustmentRequest {
    @NotNull
    private Integer quantityChange;
    @Size(max = 500)
    private String note;
}
