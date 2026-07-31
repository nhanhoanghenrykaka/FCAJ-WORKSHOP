package dev.namphamcse.shopsflow.controller;

import dev.namphamcse.shopsflow.entity.User;
import dev.namphamcse.shopsflow.service.VnPayService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payment/vnpay")
@RequiredArgsConstructor
public class PaymentController {

    private final VnPayService vnPayService;

    @PreAuthorize("hasRole('USER')")
    @PostMapping("/checkout/{orderId}")
    public ResponseEntity<Map<String, String>> checkout(
            @PathVariable Long orderId,
            @AuthenticationPrincipal User user,
            HttpServletRequest request) {
        String payUrl = vnPayService.createPaymentLink(orderId, user, request);
        return ResponseEntity.ok(Map.of("payUrl", payUrl));
    }

    @GetMapping("/callback")
    public ResponseEntity<Map<String, String>> callback(@RequestParam Map<String, String> params) {
        Map<String, String> result = vnPayService.processIpn(params);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/return")
    public ResponseEntity<Map<String, String>> paymentReturn(@RequestBody Map<String, String> params) {
        Map<String, String> result = vnPayService.processReturn(params);
        return ResponseEntity.ok(result);
    }
}
