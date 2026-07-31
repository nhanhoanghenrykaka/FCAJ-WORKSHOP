package dev.namphamcse.shopsflow.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import dev.namphamcse.shopsflow.exception.BusinessRuleViolationException;
import dev.namphamcse.shopsflow.exception.ResourceNotFoundException;

@Service
public class ProfileImageService {
    private static final long MAX_IMAGE_BYTES = 5L * 1024L * 1024L;
    private static final Map<String, String> EXTENSIONS = Map.of(
            "image/jpeg", ".jpg",
            "image/png", ".png",
            "image/webp", ".webp",
            "image/gif", ".gif");

    private final Path profileDirectory;

    public ProfileImageService(@Value("${app.upload-dir:/app/uploads}") String uploadDir) {
        this.profileDirectory = Path.of(uploadDir).toAbsolutePath().normalize().resolve("profiles");
        try {
            Files.createDirectories(this.profileDirectory);
        } catch (IOException exception) {
            throw new IllegalStateException("Could not initialize profile image storage.", exception);
        }
    }

    public String store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessRuleViolationException("Choose an image file.");
        }
        if (file.getSize() > MAX_IMAGE_BYTES) {
            throw new BusinessRuleViolationException("Profile image must be 5 MB or smaller.");
        }

        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        String extension = EXTENSIONS.get(contentType);
        if (extension == null) {
            throw new BusinessRuleViolationException("Profile image must be JPG, PNG, WEBP or GIF.");
        }

        String filename = UUID.randomUUID() + extension;
        Path target = profileDirectory.resolve(filename).normalize();
        if (!target.getParent().equals(profileDirectory)) {
            throw new BusinessRuleViolationException("Invalid profile image filename.");
        }

        try (var input = file.getInputStream()) {
            Files.copy(input, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException exception) {
            throw new IllegalStateException("Could not save profile image.", exception);
        }
        return filename;
    }

    public Resource load(String filename) {
        if (filename == null || !filename.matches("[0-9a-fA-F-]+\\.(jpg|png|webp|gif)")) {
            throw new ResourceNotFoundException("Profile image not found.");
        }
        Path path = profileDirectory.resolve(filename).normalize();
        if (!path.getParent().equals(profileDirectory) || !Files.isRegularFile(path)) {
            throw new ResourceNotFoundException("Profile image not found.");
        }
        Resource resource = new FileSystemResource(path);
        if (!resource.exists() || !resource.isReadable()) {
            throw new ResourceNotFoundException("Profile image not found.");
        }
        return resource;
    }
}
