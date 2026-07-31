package dev.namphamcse.shopsflow.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.core.io.Resource;

import dev.namphamcse.shopsflow.dto.request.AddressRequest;
import dev.namphamcse.shopsflow.dto.request.ProfileUpdateRequest;
import dev.namphamcse.shopsflow.dto.response.AddressResponse;
import dev.namphamcse.shopsflow.dto.response.ProductResponse;
import dev.namphamcse.shopsflow.dto.response.UserResponse;
import dev.namphamcse.shopsflow.entity.User;
import dev.namphamcse.shopsflow.service.AccountService;
import dev.namphamcse.shopsflow.service.ProfileImageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/account")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class AccountController {
    private final AccountService accountService;
    private final ProfileImageService profileImageService;

    @GetMapping
    public ResponseEntity<UserResponse> profile(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(accountService.getProfile(user));
    }

    @PutMapping
    public ResponseEntity<UserResponse> updateProfile(@AuthenticationPrincipal User user,
                                                       @Valid @RequestBody ProfileUpdateRequest request) {
        return ResponseEntity.ok(accountService.updateProfile(user, request));
    }

    @PostMapping(value = "/profile-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UserResponse> uploadProfileImage(@AuthenticationPrincipal User user,
                                                            @RequestPart("file") MultipartFile file) {
        String filename = profileImageService.store(file);
        String imageUrl = "/api/account/profile-images/" + filename;
        return ResponseEntity.ok(accountService.updateProfileImage(user, imageUrl));
    }

    @GetMapping(value = "/profile-images/{filename}")
    @PreAuthorize("permitAll()")
    public ResponseEntity<Resource> profileImage(@PathVariable String filename) {
        Resource image = profileImageService.load(filename);
        String lower = filename.toLowerCase();
        MediaType mediaType = lower.endsWith(".png") ? MediaType.IMAGE_PNG
                : lower.endsWith(".gif") ? MediaType.IMAGE_GIF
                : lower.endsWith(".webp") ? MediaType.parseMediaType("image/webp")
                : MediaType.IMAGE_JPEG;
        return ResponseEntity.ok().contentType(mediaType).body(image);
    }

    @PreAuthorize("hasRole('USER')")
    @GetMapping("/addresses")
    public ResponseEntity<List<AddressResponse>> addresses(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(accountService.getAddresses(user));
    }

    @PreAuthorize("hasRole('USER')")
    @PostMapping("/addresses")
    public ResponseEntity<AddressResponse> createAddress(@AuthenticationPrincipal User user,
                                                          @Valid @RequestBody AddressRequest request) {
        return ResponseEntity.ok(accountService.createAddress(user, request));
    }

    @PreAuthorize("hasRole('USER')")
    @PutMapping("/addresses/{id}")
    public ResponseEntity<AddressResponse> updateAddress(@AuthenticationPrincipal User user,
                                                          @PathVariable Long id,
                                                          @Valid @RequestBody AddressRequest request) {
        return ResponseEntity.ok(accountService.updateAddress(user, id, request));
    }

    @PreAuthorize("hasRole('USER')")
    @DeleteMapping("/addresses/{id}")
    public ResponseEntity<Void> deleteAddress(@AuthenticationPrincipal User user, @PathVariable Long id) {
        accountService.deleteAddress(user, id);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasRole('USER')")
    @GetMapping("/wishlist")
    public ResponseEntity<List<ProductResponse>> wishlist(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(accountService.getWishlist(user));
    }

    @PreAuthorize("hasRole('USER')")
    @GetMapping("/wishlist/{productId}")
    public ResponseEntity<Map<String, Boolean>> wishlistStatus(@AuthenticationPrincipal User user,
                                                                @PathVariable Long productId) {
        return ResponseEntity.ok(Map.of("wishlisted", accountService.isWishlisted(user, productId)));
    }

    @PreAuthorize("hasRole('USER')")
    @PostMapping("/wishlist/{productId}")
    public ResponseEntity<ProductResponse> addWishlist(@AuthenticationPrincipal User user, @PathVariable Long productId) {
        return ResponseEntity.ok(accountService.addWishlist(user, productId));
    }

    @PreAuthorize("hasRole('USER')")
    @DeleteMapping("/wishlist/{productId}")
    public ResponseEntity<Void> removeWishlist(@AuthenticationPrincipal User user, @PathVariable Long productId) {
        accountService.removeWishlist(user, productId);
        return ResponseEntity.noContent().build();
    }
}
