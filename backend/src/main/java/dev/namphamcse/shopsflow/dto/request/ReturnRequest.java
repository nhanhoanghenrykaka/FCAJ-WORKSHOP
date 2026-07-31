package dev.namphamcse.shopsflow.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ReturnRequest {
    @NotBlank
    @Size(max = 1000)
    private String reason;
}
