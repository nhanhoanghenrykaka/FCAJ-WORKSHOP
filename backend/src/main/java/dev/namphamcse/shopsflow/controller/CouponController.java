package dev.namphamcse.shopsflow.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import dev.namphamcse.shopsflow.dto.response.CouponResponse;
import dev.namphamcse.shopsflow.entity.User;
import dev.namphamcse.shopsflow.service.CouponService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/coupons")
@RequiredArgsConstructor
public class CouponController {
    private final CouponService couponService;

    @GetMapping("/available")
    public ResponseEntity<List<CouponResponse>> available(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(couponService.getAvailableForUser(user));
    }

    @GetMapping("/validate")
    public ResponseEntity<CouponResponse> validate(@AuthenticationPrincipal User user, @RequestParam String code) {
        return ResponseEntity.ok(couponService.getActiveByCode(user, code));
    }
}
