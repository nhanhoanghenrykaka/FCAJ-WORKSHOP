package dev.namphamcse.shopsflow.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import dev.namphamcse.shopsflow.entity.Notification;
import dev.namphamcse.shopsflow.entity.User;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByRecipientOrderByCreatedAtDesc(User recipient);
    Optional<Notification> findByIdAndRecipient(Long id, User recipient);
    List<Notification> findByRecipientAndReadFalse(User recipient);
    long countByRecipientAndReadFalse(User recipient);
}
