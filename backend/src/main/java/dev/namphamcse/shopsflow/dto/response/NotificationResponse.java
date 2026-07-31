package dev.namphamcse.shopsflow.dto.response;

import java.time.Instant;

import dev.namphamcse.shopsflow.entity.enums.NotificationType;
import dev.namphamcse.shopsflow.entity.enums.Role;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {
    private Long id;
    private Long actorUserId;
    private String actorName;
    private Role actorRole;
    private NotificationType type;
    private String title;
    private String message;
    private String targetUrl;
    private boolean read;
    private Instant createdAt;
}
