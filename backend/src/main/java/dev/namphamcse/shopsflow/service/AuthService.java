package dev.namphamcse.shopsflow.service;

import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.namphamcse.shopsflow.dto.request.GoogleAuthRequest;
import dev.namphamcse.shopsflow.dto.request.LoginRequest;
import dev.namphamcse.shopsflow.dto.request.RegisterRequest;
import dev.namphamcse.shopsflow.dto.response.AuthResponse;
import dev.namphamcse.shopsflow.entity.User;
import dev.namphamcse.shopsflow.entity.enums.NotificationType;
import dev.namphamcse.shopsflow.entity.enums.Role;
import dev.namphamcse.shopsflow.exception.BusinessRuleViolationException;
import dev.namphamcse.shopsflow.exception.DuplicateResourceException;
import dev.namphamcse.shopsflow.mapper.UserMapper;
import dev.namphamcse.shopsflow.repository.UserRepository;
import dev.namphamcse.shopsflow.security.JwtUtil;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;
    private final NotificationService notificationService;
    private final RegistrationOtpService registrationOtpService;
    private final GoogleIdentityService googleIdentityService;

    @Transactional
    public void register(RegisterRequest request) {
        String email = registrationOtpService.normalizeAndValidateGmail(request.getEmail());
        String name = request.getName().trim();

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new DuplicateResourceException("Email already exists: " + email);
        }

        registrationOtpService.assertVerified(email, request.getVerificationToken());

        User user = new User(name, email, passwordEncoder.encode(request.getPassword()));
        User savedUser = userRepository.save(user);
        registrationOtpService.consumeVerification(email);

        notifyNewCustomer(savedUser, "created a customer account after Gmail OTP verification.");
    }

    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.getEmail());
        User loginUser = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (loginUser != null) assertNotBanned(loginUser);
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, request.getPassword()));

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new IllegalStateException("Authenticated user no longer exists"));
        return completeSignIn(user);
    }

    @Transactional
    public AuthResponse googleAuth(GoogleAuthRequest request) {
        GoogleIdentityService.GoogleProfile profile = googleIdentityService.verify(request.getCredential());

        Optional<User> bySubject = userRepository.findByGoogleSubject(profile.subject());
        User user;
        boolean created = false;

        if (bySubject.isPresent()) {
            user = bySubject.get();
            assertGoogleCustomer(user);
            assertNotBanned(user);
            if (!user.getEmail().equalsIgnoreCase(profile.email())) {
                throw new BusinessRuleViolationException(
                        "This Google account is linked to a different Shopsflow email.");
            }
        } else {
            Optional<User> byEmail = userRepository.findByEmailIgnoreCase(profile.email());
            if (byEmail.isPresent()) {
                user = byEmail.get();
                assertGoogleCustomer(user);
                assertNotBanned(user);
                if (user.getGoogleSubject() != null
                        && !user.getGoogleSubject().equals(profile.subject())) {
                    throw new BusinessRuleViolationException(
                            "This Gmail address is already linked to another Google account.");
                }
                user.setGoogleSubject(profile.subject());
                user = userRepository.save(user);
            } else {
                // Google-only accounts never authenticate with a local password.
                // Store an unguessable disabled marker instead of passing an SSO token
                // or generated secret through BCrypt. This avoids BCrypt's 72-byte raw
                // password limit entirely for Google sign-in.
                String generatedPassword = "{google-disabled}" + UUID.randomUUID();
                user = new User(profile.name(), profile.email(), generatedPassword);
                user.setGoogleSubject(profile.subject());
                user.setRole(Role.USER);
                user = userRepository.save(user);
                created = true;
            }
        }

        if (created) {
            notifyNewCustomer(user, "registered with a verified Google account.");
        }

        return completeSignIn(user);
    }

    private void assertNotBanned(User user) {
        if (user.isBanned()) {
            throw new BusinessRuleViolationException("Tài khoản của bạn đã bị cấm." +
                    (user.getBannedReason() == null ? "" : " Lý do: " + user.getBannedReason()));
        }
    }

    private void assertGoogleCustomer(User user) {
        if (user.getRole() == Role.ADMIN) {
            throw new BusinessRuleViolationException(
                    "Admin accounts must sign in with email and password.");
        }
    }

    private AuthResponse completeSignIn(User user) {
        String token = jwtUtil.generateToken(user);
        return new AuthResponse(token, UserMapper.toResponse(user));
    }

    private void notifyNewCustomer(User savedUser, String adminMessageSuffix) {
        notificationService.notifyRole(
                Role.ADMIN,
                savedUser,
                NotificationType.ACCOUNT,
                "New customer registered",
                savedUser.getName() + " " + adminMessageSuffix,
                "/admin");
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
