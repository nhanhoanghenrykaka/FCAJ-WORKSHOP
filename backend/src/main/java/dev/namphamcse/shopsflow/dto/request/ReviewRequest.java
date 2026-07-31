package dev.namphamcse.shopsflow.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ReviewRequest {
    @NotNull
    @Min(1)
    @Max(5)
    private Integer stars;

    @Size(max = 2000)
    private String comment;
}
