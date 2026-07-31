package dev.namphamcse.shopsflow.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AddressRequest {
    @NotBlank @Size(max = 255)
    private String receiverName;
    @NotBlank @Size(max = 50)
    private String phone;
    @NotBlank @Size(max = 500)
    private String line1;
    @Size(max = 255)
    private String ward;
    @Size(max = 255)
    private String district;
    @NotBlank @Size(max = 255)
    private String province;
    private boolean defaultAddress;
}
