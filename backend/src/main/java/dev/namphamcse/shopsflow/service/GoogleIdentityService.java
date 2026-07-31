package dev.namphamcse.shopsflow.service;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Collections;
import java.util.Locale;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;

import dev.namphamcse.shopsflow.exception.ExternalServiceException;

@Service
public class GoogleIdentityService {

    private final String clientId;
    private final GoogleIdTokenVerifier verifier;

    public GoogleIdentityService(@Value("${app.google.client-id:}") String clientId) {
        this.clientId = clientId == null ? "" : clientId.trim();
        this.verifier = buildVerifier(this.clientId);
    }

    public GoogleProfile verify(String credential) {
        if (clientId.isBlank() || verifier == null) {
            throw new IllegalArgumentException(
                    "Google sign-in is not configured. Set GOOGLE_CLIENT_ID on the backend.");
        }
        if (credential == null || credential.isBlank()) {
            throw new IllegalArgumentException("Google credential is required.");
        }

        try {
            GoogleIdToken idToken = verifier.verify(credential.trim());
            if (idToken == null) {
                throw new IllegalArgumentException("Google sign-in token is invalid or expired.");
            }

            GoogleIdToken.Payload payload = idToken.getPayload();
            String subject = normalize(payload.getSubject());
            String email = normalizeEmail(payload.getEmail());
            String name = normalize((String) payload.get("name"));
            Boolean emailVerified = payload.getEmailVerified();

            if (!Boolean.TRUE.equals(emailVerified)) {
                throw new IllegalArgumentException("Google has not verified this email address.");
            }
            if (!email.endsWith("@gmail.com")) {
                throw new IllegalArgumentException(
                        "Shopsflow Google registration currently accepts @gmail.com accounts only.");
            }
            if (subject.isBlank()) {
                throw new IllegalArgumentException("Google account identifier is missing.");
            }
            if (name.isBlank()) {
                String localPart = email.substring(0, email.indexOf('@'));
                name = localPart.isBlank() ? "Shopsflow Customer" : localPart;
            }

            return new GoogleProfile(subject, email, name);
        } catch (GeneralSecurityException ex) {
            throw new IllegalArgumentException("Google sign-in token could not be verified.", ex);
        } catch (IOException ex) {
            throw new ExternalServiceException(
                    "Google sign-in is temporarily unavailable. Please try again.", ex);
        }
    }

    private GoogleIdTokenVerifier buildVerifier(String configuredClientId) {
        if (configuredClientId.isBlank()) {
            return null;
        }
        try {
            return new GoogleIdTokenVerifier.Builder(
                    GoogleNetHttpTransport.newTrustedTransport(),
                    GsonFactory.getDefaultInstance())
                    .setAudience(Collections.singletonList(configuredClientId))
                    .build();
        } catch (GeneralSecurityException | IOException ex) {
            throw new IllegalStateException("Could not initialize Google identity verification.", ex);
        }
    }

    private String normalizeEmail(String value) {
        return normalize(value).toLowerCase(Locale.ROOT);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    public record GoogleProfile(String subject, String email, String name) {
    }
}
