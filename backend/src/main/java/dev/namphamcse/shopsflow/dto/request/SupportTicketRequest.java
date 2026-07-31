package dev.namphamcse.shopsflow.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SupportTicketRequest {
    @NotNull
    private Long categoryId;
    @NotNull
    private Long productId;
    @NotBlank @Size(max = 255)
    private String subject;
    @NotBlank @Size(max = 3000)
    private String message;
}
