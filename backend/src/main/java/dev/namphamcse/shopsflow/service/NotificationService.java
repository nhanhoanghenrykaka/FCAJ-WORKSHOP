package dev.namphamcse.shopsflow.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.namphamcse.shopsflow.dto.response.NotificationResponse;
import dev.namphamcse.shopsflow.entity.Notification;
import dev.namphamcse.shopsflow.entity.User;
import dev.namphamcse.shopsflow.entity.enums.NotificationType;
import dev.namphamcse.shopsflow.entity.enums.Role;
import dev.namphamcse.shopsflow.exception.ResourceNotFoundException;
import dev.namphamcse.shopsflow.repository.NotificationRepository;
import dev.namphamcse.shopsflow.repository.UserRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NotificationService {
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public List<NotificationResponse> getNotifications(User user) {
        return notificationRepository.findByRecipientOrderByCreatedAtDesc(user)
                .stream()
                .filter(this::isRelevantCrossRoleNotification)
                .map(this::toResponse)
                .toList();
    }

    public long getUnreadCount(User user) {
        return notificationRepository.findByRecipientAndReadFalse(user)
                .stream()
                .filter(this::isRelevantCrossRoleNotification)
                .count();
    }

    @Transactional
    public NotificationResponse markRead(User user, Long notificationId) {
        Notification notification = notificationRepository.findByIdAndRecipient(notificationId, user)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Notification not found: " + notificationId));
        if (!notification.isRead()) {
            notification.setRead(true);
        }
        return toResponse(notification);
    }

    @Transactional
    public void markAllRead(User user) {
        List<Notification> unread = notificationRepository.findByRecipientAndReadFalse(user);
        unread.forEach(notification -> notification.setRead(true));
    }

    @Transactional
    public void recordSignOut(User user) {
        // Sign-out is initiated by the same role, so it intentionally creates no notification.
    }

    @Transactional
    public void notifyUser(
            User recipient,
            User actor,
            NotificationType type,
            String title,
            String message,
            String targetUrl) {
        if (recipient == null) return;
        save(recipient, actor, null, type, title, message, targetUrl);
    }

    @Transactional
    public void notifyUserFromSystem(
            User recipient,
            String actorName,
            NotificationType type,
            String title,
            String message,
            String targetUrl) {
        if (recipient == null) return;
        save(recipient, null, actorName, type, title, message, targetUrl);
    }

    @Transactional
    public void notifyRole(
            Role recipientRole,
            User actor,
            NotificationType type,
            String title,
            String message,
            String targetUrl) {
        for (User recipient : userRepository.findAllByRole(recipientRole)) {
            save(recipient, actor, null, type, title, message, targetUrl);
        }
    }

    @Transactional
    public void notifyRoleFromSystem(
            Role recipientRole,
            String actorName,
            NotificationType type,
            String title,
            String message,
            String targetUrl) {
        for (User recipient : userRepository.findAllByRole(recipientRole)) {
            save(recipient, null, actorName, type, title, message, targetUrl);
        }
    }

    private void save(
            User recipient,
            User actor,
            String systemActorName,
            NotificationType type,
            String title,
            String message,
            String targetUrl) {
        // A role does not need notifications about actions performed by that same role.
        // Keep only cross-role activity (CUSTOMER -> ADMIN / ADMIN -> CUSTOMER) and system events.
        if (actor != null && actor.getRole() == recipient.getRole()) return;

        Notification notification = new Notification();
        notification.setRecipient(recipient);
        notification.setType(type);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setTargetUrl(targetUrl);

        if (actor != null) {
            notification.setActorUserId(actor.getId());
            notification.setActorName(actor.getName());
            notification.setActorRole(actor.getRole());
        } else {
            notification.setActorName(systemActorName == null || systemActorName.isBlank()
                    ? "Shopsflow"
                    : systemActorName.trim());
        }

        notificationRepository.save(notification);
    }

    private boolean isRelevantCrossRoleNotification(Notification notification) {
        Role actorRole = notification.getActorRole();
        if (actorRole == null) return true; // system/VNPay/etc.
        return notification.getRecipient() != null
                && actorRole != notification.getRecipient().getRole();
    }

    private NotificationResponse toResponse(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getActorUserId(),
                notification.getActorName(),
                notification.getActorRole(),
                notification.getType(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getTargetUrl(),
                notification.isRead(),
                notification.getCreatedAt());
    }
}
