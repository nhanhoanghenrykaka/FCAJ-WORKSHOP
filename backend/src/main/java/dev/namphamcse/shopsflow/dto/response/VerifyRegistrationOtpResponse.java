package dev.namphamcse.shopsflow.dto.response;

public record VerifyRegistrationOtpResponse(
        boolean verified,
        String verificationToken,
        int validForSeconds) {
}
