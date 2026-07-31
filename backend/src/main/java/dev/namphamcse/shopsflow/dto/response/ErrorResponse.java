package dev.namphamcse.shopsflow.dto.response;

import java.time.Instant;
import java.util.Map;

public record ErrorResponse(
        int status,
        String message,
        Instant timestamp,
        String path,
        Map<String, String> fieldErrors // null when not a validation error
) {
    public static ErrorResponse of(int status, String message,
            String path) {
        return new ErrorResponse(status, message,
                Instant.now(), path, null);
    }

    public static ErrorResponse validation(String path,
            Map<String, String> fieldErrors) {
        return new ErrorResponse(400, "Validation failed",
                Instant.now(), path, fieldErrors);
    }
}
