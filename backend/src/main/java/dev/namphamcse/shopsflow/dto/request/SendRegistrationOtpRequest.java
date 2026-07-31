package dev.namphamcse.shopsflow.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SendRegistrationOtpRequest {

    @NotBlank
    @Email
    @Size(max = 255)
    private String email;
}
