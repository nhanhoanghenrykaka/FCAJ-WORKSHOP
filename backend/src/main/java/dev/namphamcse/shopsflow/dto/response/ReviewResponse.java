package dev.namphamcse.shopsflow.dto.response;

import java.time.Instant;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ReviewResponse {
    private Long id;
    private Integer stars;
    private String comment;
    private Instant createdAt;
    private Long userId;
    private String userName;
    private Long productId;
    private String productName;
    private boolean verifiedPurchase;
}
