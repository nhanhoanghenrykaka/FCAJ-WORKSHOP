package dev.namphamcse.shopsflow.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "registration_email_verifications")
@Getter
@Setter
@NoArgsConstructor
public class RegistrationEmailVerification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "otp_hash", length = 100)
    private String otpHash;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "last_sent_at")
    private Instant lastSentAt;

    @Column(nullable = false)
    private int attempts;

    @Column(name = "verification_token_hash", length = 100)
    private String verificationTokenHash;

    @Column(name = "verified_until")
    private Instant verifiedUntil;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
