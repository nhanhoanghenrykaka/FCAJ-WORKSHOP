package dev.namphamcse.shopsflow.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.namphamcse.shopsflow.dto.request.GoogleAuthRequest;
import dev.namphamcse.shopsflow.dto.request.LoginRequest;
import dev.namphamcse.shopsflow.dto.request.RegisterRequest;
import dev.namphamcse.shopsflow.dto.request.SendRegistrationOtpRequest;
import dev.namphamcse.shopsflow.dto.request.VerifyRegistrationOtpRequest;
import dev.namphamcse.shopsflow.dto.response.AuthResponse;
import dev.namphamcse.shopsflow.dto.response.SendRegistrationOtpResponse;
import dev.namphamcse.shopsflow.dto.response.VerifyRegistrationOtpResponse;
import dev.namphamcse.shopsflow.service.AuthService;
import dev.namphamcse.shopsflow.service.RegistrationOtpService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final RegistrationOtpService registrationOtpService;

    @PostMapping("/register/otp/send")
    public ResponseEntity<SendRegistrationOtpResponse> sendRegistrationOtp(
            @RequestBody @Valid SendRegistrationOtpRequest request) {
        return ResponseEntity.ok(registrationOtpService.sendOtp(request.getEmail()));
    }

    @PostMapping("/register/otp/verify")
    public ResponseEntity<VerifyRegistrationOtpResponse> verifyRegistrationOtp(
            @RequestBody @Valid VerifyRegistrationOtpRequest request) {
        return ResponseEntity.ok(registrationOtpService.verifyOtp(request.getEmail(), request.getOtp()));
    }

    @PostMapping("/register")
    public ResponseEntity<Void> register(@RequestBody @Valid RegisterRequest request) {
        authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody @Valid LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> googleAuth(@RequestBody @Valid GoogleAuthRequest request) {
        return ResponseEntity.ok(authService.googleAuth(request));
    }
}
