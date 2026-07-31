package dev.namphamcse.shopsflow.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SupportMessageRequest {
    @NotBlank @Size(max = 3000)
    private String message;
}
