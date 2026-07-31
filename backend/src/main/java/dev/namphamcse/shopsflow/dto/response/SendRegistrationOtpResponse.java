package dev.namphamcse.shopsflow.dto.response;

public record SendRegistrationOtpResponse(
        int expiresInSeconds,
        int resendAfterSeconds) {
}
