package dev.namphamcse.shopsflow.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import dev.namphamcse.shopsflow.dto.request.SupportMessageRequest;
import dev.namphamcse.shopsflow.dto.request.SupportTicketRequest;
import dev.namphamcse.shopsflow.dto.response.SupportTicketResponse;
import dev.namphamcse.shopsflow.entity.User;
import dev.namphamcse.shopsflow.service.SupportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/support")
@RequiredArgsConstructor
public class SupportController {
    private final SupportService supportService;

    @PreAuthorize("hasRole('USER')")
    @GetMapping
    public ResponseEntity<List<SupportTicketResponse>> mine(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(supportService.getForUser(user));
    }

    @PreAuthorize("hasRole('USER')")
    @PostMapping
    public ResponseEntity<SupportTicketResponse> create(@AuthenticationPrincipal User user,
                                                         @Valid @RequestBody SupportTicketRequest request) {
        return ResponseEntity.ok(supportService.create(user, request));
    }

    @PostMapping("/{id}/messages")
    public ResponseEntity<SupportTicketResponse> message(@AuthenticationPrincipal User user,
                                                          @PathVariable Long id,
                                                          @Valid @RequestBody SupportMessageRequest request) {
        return ResponseEntity.ok(supportService.addMessage(user, id, request));
    }

    @PutMapping("/{id}/close")
    public ResponseEntity<SupportTicketResponse> close(@AuthenticationPrincipal User user, @PathVariable Long id) {
        return ResponseEntity.ok(supportService.close(user, id));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/all")
    public ResponseEntity<List<SupportTicketResponse>> all() {
        return ResponseEntity.ok(supportService.getAll());
    }
}
