package dev.namphamcse.shopsflow.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CustomerBanRequest {
    private boolean banned;
    @Size(max = 500)
    private String reason;
}
