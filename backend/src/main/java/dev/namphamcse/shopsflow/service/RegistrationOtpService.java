package dev.namphamcse.shopsflow.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Locale;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.namphamcse.shopsflow.dto.response.SendRegistrationOtpResponse;
import dev.namphamcse.shopsflow.dto.response.VerifyRegistrationOtpResponse;
import dev.namphamcse.shopsflow.entity.RegistrationEmailVerification;
import dev.namphamcse.shopsflow.exception.BusinessRuleViolationException;
import dev.namphamcse.shopsflow.exception.DuplicateResourceException;
import dev.namphamcse.shopsflow.exception.ExternalServiceException;
import dev.namphamcse.shopsflow.repository.RegistrationEmailVerificationRepository;
import dev.namphamcse.shopsflow.repository.UserRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RegistrationOtpService {

    private static final Pattern GMAIL_PATTERN = Pattern.compile(
            "^[A-Z0-9._%+-]+@gmail\\.com$",
            Pattern.CASE_INSENSITIVE);

    private final RegistrationEmailVerificationRepository verificationRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JavaMailSender mailSender;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${app.registration.otp.expiration-minutes:5}")
    private int otpExpirationMinutes;

    @Value("${app.registration.otp.resend-cooldown-seconds:60}")
    private int resendCooldownSeconds;

    @Value("${app.registration.otp.max-attempts:5}")
    private int maxAttempts;

    @Value("${app.registration.otp.verification-valid-minutes:15}")
    private int verificationValidMinutes;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${spring.mail.password:}")
    private String mailPassword;

    @Value("${app.registration.otp.from:}")
    private String configuredFrom;

    @Transactional
    public SendRegistrationOtpResponse sendOtp(String rawEmail) {
        String email = normalizeAndValidateGmail(rawEmail);

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new DuplicateResourceException("Email already exists: " + email);
        }
        if (mailUsername == null || mailUsername.isBlank()
                || mailPassword == null || mailPassword.isBlank()) {
            throw new ExternalServiceException(
                    "Registration email is not configured. Set MAIL_USERNAME and MAIL_PASSWORD first.");
        }

        Instant now = Instant.now();
        RegistrationEmailVerification verification = verificationRepository
                .findByEmailIgnoreCase(email)
                .orElseGet(RegistrationEmailVerification::new);

        if (verification.getLastSentAt() != null) {
            long elapsed = Duration.between(verification.getLastSentAt(), now).getSeconds();
            if (elapsed < resendCooldownSeconds) {
                long remaining = resendCooldownSeconds - elapsed;
                throw new BusinessRuleViolationException(
                        "Please wait " + remaining + " seconds before requesting another OTP.");
            }
        }

        String otp = String.format(Locale.ROOT, "%06d", secureRandom.nextInt(1_000_000));
        verification.setEmail(email);
        verification.setOtpHash(passwordEncoder.encode(otp));
        verification.setExpiresAt(now.plus(Duration.ofMinutes(otpExpirationMinutes)));
        verification.setLastSentAt(now);
        verification.setAttempts(0);
        verification.setVerificationTokenHash(null);
        verification.setVerifiedUntil(null);
        if (verification.getCreatedAt() == null) {
            verification.setCreatedAt(now);
        }
        verification.setUpdatedAt(now);
        verificationRepository.save(verification);

        SimpleMailMessage message = new SimpleMailMessage();
        String from = configuredFrom == null || configuredFrom.isBlank()
                ? mailUsername.trim()
                : configuredFrom.trim();
        message.setFrom(from);
        message.setTo(email);
        message.setSubject("Shopsflow registration OTP");
        message.setText(buildOtpEmail(otp));

        try {
            mailSender.send(message);
        } catch (MailException exception) {
            throw new ExternalServiceException(
                    "Could not send the OTP email. Check the Gmail SMTP configuration and try again.",
                    exception);
        }

        return new SendRegistrationOtpResponse(
                Math.max(1, otpExpirationMinutes) * 60,
                Math.max(0, resendCooldownSeconds));
    }

    public VerifyRegistrationOtpResponse verifyOtp(String rawEmail, String rawOtp) {
        String email = normalizeAndValidateGmail(rawEmail);
        String otp = rawOtp == null ? "" : rawOtp.trim();
        if (!otp.matches("\\d{6}")) {
            throw new IllegalArgumentException("OTP must contain exactly 6 digits.");
        }

        RegistrationEmailVerification verification = verificationRepository
                .findByEmailIgnoreCase(email)
                .orElseThrow(() -> new BusinessRuleViolationException(
                        "No OTP request was found for this Gmail address. Request a new OTP."));

        Instant now = Instant.now();
        if (verification.getExpiresAt() == null || !verification.getExpiresAt().isAfter(now)) {
            verificationRepository.delete(verification);
            throw new BusinessRuleViolationException("The OTP has expired. Request a new OTP.");
        }
        if (verification.getAttempts() >= maxAttempts) {
            throw new BusinessRuleViolationException(
                    "Too many incorrect OTP attempts. Request a new OTP.");
        }

        if (verification.getOtpHash() == null || !passwordEncoder.matches(otp, verification.getOtpHash())) {
            verification.setAttempts(verification.getAttempts() + 1);
            verification.setUpdatedAt(now);
            verificationRepository.save(verification);
            int remaining = Math.max(0, maxAttempts - verification.getAttempts());
            throw new BusinessRuleViolationException(
                    remaining == 0
                            ? "Incorrect OTP. Request a new OTP to continue."
                            : "Incorrect OTP. " + remaining + " attempt(s) remaining.");
        }

        String verificationToken = generateVerificationToken();
        verification.setOtpHash(null);
        verification.setVerificationTokenHash(hashToken(verificationToken));
        verification.setVerifiedUntil(now.plus(Duration.ofMinutes(verificationValidMinutes)));
        verification.setUpdatedAt(now);
        verificationRepository.save(verification);

        return new VerifyRegistrationOtpResponse(
                true,
                verificationToken,
                Math.max(1, verificationValidMinutes) * 60);
    }

    public void assertVerified(String rawEmail, String verificationToken) {
        String email = normalizeAndValidateGmail(rawEmail);
        String token = verificationToken == null ? "" : verificationToken.trim();
        if (token.isBlank()) {
            throw new BusinessRuleViolationException("Verify your Gmail OTP before creating the account.");
        }

        RegistrationEmailVerification verification = verificationRepository
                .findByEmailIgnoreCase(email)
                .orElseThrow(() -> new BusinessRuleViolationException(
                        "Verify your Gmail OTP before creating the account."));

        Instant now = Instant.now();
        if (verification.getVerifiedUntil() == null || !verification.getVerifiedUntil().isAfter(now)) {
            throw new BusinessRuleViolationException(
                    "Your Gmail verification has expired. Request and verify a new OTP.");
        }
        if (verification.getVerificationTokenHash() == null
                || !MessageDigest.isEqual(
                        verification.getVerificationTokenHash().getBytes(StandardCharsets.UTF_8),
                        hashToken(token).getBytes(StandardCharsets.UTF_8))) {
            throw new BusinessRuleViolationException(
                    "Gmail verification is invalid. Request and verify a new OTP.");
        }
    }

    public void consumeVerification(String rawEmail) {
        verificationRepository.deleteByEmailIgnoreCase(normalizeAndValidateGmail(rawEmail));
    }

    public String normalizeAndValidateGmail(String rawEmail) {
        String email = rawEmail == null ? "" : rawEmail.trim().toLowerCase(Locale.ROOT);
        if (!GMAIL_PATTERN.matcher(email).matches()) {
            throw new IllegalArgumentException("Registration requires a valid @gmail.com address.");
        }
        return email;
    }

    private String buildOtpEmail(String otp) {
        return "Your Shopsflow verification code is: " + otp + "\n\n"
                + "This code expires in " + otpExpirationMinutes + " minutes.\n"
                + "Do not share this code with anyone.\n\n"
                + "If you did not request a Shopsflow account, you can ignore this email.";
    }

    private String generateVerificationToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return Base64.getUrlEncoder().withoutPadding().encodeToString(
                    digest.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }
}
