package dev.namphamcse.shopsflow.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.namphamcse.shopsflow.dto.request.CouponRequest;
import dev.namphamcse.shopsflow.dto.response.CouponResponse;
import dev.namphamcse.shopsflow.entity.Coupon;
import dev.namphamcse.shopsflow.entity.User;
import dev.namphamcse.shopsflow.entity.enums.DiscountType;
import dev.namphamcse.shopsflow.entity.enums.NotificationType;
import dev.namphamcse.shopsflow.entity.enums.Role;
import dev.namphamcse.shopsflow.exception.BusinessRuleViolationException;
import dev.namphamcse.shopsflow.exception.DuplicateResourceException;
import dev.namphamcse.shopsflow.exception.ResourceNotFoundException;
import dev.namphamcse.shopsflow.repository.CouponRepository;
import dev.namphamcse.shopsflow.repository.OrderRepository;
import dev.namphamcse.shopsflow.repository.UserRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CouponService {
    private final CouponRepository couponRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;

    public List<CouponResponse> getAll() {
        return couponRepository.findAllByOrderByCreatedAtDesc().stream().map(this::toResponse).toList();
    }

    public List<CouponResponse> getAvailableForUser(User user) {
        return couponRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(coupon -> isAudienceAllowed(coupon, user))
                .filter(coupon -> isWithinPerCustomerLimit(coupon, user))
                .filter(this::isCurrentlyUsable)
                .map(this::toResponse)
                .toList();
    }

    public CouponResponse getActiveByCode(User user, String code) {
        if (code == null || code.isBlank()) throw new BusinessRuleViolationException("Coupon code is required");
        return toResponse(requireUsable(code, user));
    }

    @Transactional
    public CouponResponse create(User admin, CouponRequest request) {
        String code = normalizeCode(request.getCode());
        if (couponRepository.existsByCodeIgnoreCase(code)) throw new DuplicateResourceException("Coupon already exists: " + code);
        Coupon coupon = new Coupon();
        apply(coupon, request, code);
        Coupon saved = couponRepository.save(coupon);
        notifyAudience(admin, saved, "New promotion: " + saved.getCode(), buildPromoMessage(saved));
        auditService.log(admin, "COUPON_CREATED", "COUPON", saved.getId(), saved.getCode());
        return toResponse(saved);
    }

    @Transactional
    public CouponResponse update(User admin, Long id, CouponRequest request) {
        Coupon coupon = couponRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Coupon not found: " + id));
        String code = normalizeCode(request.getCode());
        couponRepository.findByCodeIgnoreCase(code).filter(other -> !other.getId().equals(id))
                .ifPresent(other -> { throw new DuplicateResourceException("Coupon already exists: " + code); });
        apply(coupon, request, code);
        Coupon saved = couponRepository.save(coupon);
        auditService.log(admin, "COUPON_UPDATED", "COUPON", saved.getId(), saved.getCode());
        return toResponse(saved);
    }

    @Transactional
    public void delete(User admin, Long id) {
        Coupon coupon = couponRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Coupon not found: " + id));
        couponRepository.delete(coupon);
        auditService.log(admin, "COUPON_DELETED", "COUPON", id, coupon.getCode());
    }

    public Coupon requireUsable(String code, User user) {
        if (code == null || code.isBlank()) return null;
        Coupon coupon = couponRepository.findByCodeIgnoreCase(normalizeCode(code))
                .orElseThrow(() -> new ResourceNotFoundException("Coupon not found: " + code));
        assertCurrentlyUsable(coupon);
        if (!isAudienceAllowed(coupon, user)) throw new BusinessRuleViolationException("This coupon is not assigned to your account");
        assertWithinPerCustomerLimit(coupon, user);
        return coupon;
    }

    public BigDecimal calculateDiscount(Coupon coupon, BigDecimal subtotal) {
        if (coupon == null) return BigDecimal.ZERO;
        if (subtotal.compareTo(coupon.getMinimumOrder()) < 0) {
            throw new BusinessRuleViolationException("Order total must be at least " + coupon.getMinimumOrder() + " to use " + coupon.getCode());
        }
        BigDecimal discount = coupon.getDiscountType() == DiscountType.PERCENT
                ? subtotal.multiply(coupon.getDiscountValue()).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP)
                : coupon.getDiscountValue();
        return discount.min(subtotal).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
    }

    @Transactional
    public void markUsed(Coupon coupon) {
        if (coupon == null) return;
        coupon.setUsedCount(coupon.getUsedCount() + 1);
        couponRepository.save(coupon);
    }

    private void apply(Coupon coupon, CouponRequest request, String code) {
        if (request.getStartsAt() != null && request.getEndsAt() != null && !request.getEndsAt().isAfter(request.getStartsAt())) {
            throw new BusinessRuleViolationException("Coupon end time must be after the start time");
        }
        if (request.getUsageLimit() != null && coupon.getUsedCount() != null && request.getUsageLimit() < coupon.getUsedCount()) {
            throw new BusinessRuleViolationException("Usage limit cannot be lower than the number of uses already recorded");
        }
        if (request.getDiscountType() == DiscountType.PERCENT && request.getDiscountValue().compareTo(new BigDecimal("100")) > 0) {
            throw new BusinessRuleViolationException("Percentage discount cannot exceed 100");
        }
        coupon.setCode(code);
        coupon.setDiscountType(request.getDiscountType());
        coupon.setDiscountValue(request.getDiscountValue().setScale(2, RoundingMode.HALF_UP));
        coupon.setMinimumOrder(request.getMinimumOrder() == null ? BigDecimal.ZERO : request.getMinimumOrder());
        coupon.setActive(request.isActive());
        coupon.setStartsAt(request.getStartsAt());
        coupon.setEndsAt(request.getEndsAt());
        coupon.setUsageLimit(request.getUsageLimit());
        coupon.setPerCustomerUsageLimit(request.getPerCustomerUsageLimit() == null ? 1 : request.getPerCustomerUsageLimit());
        coupon.setAudienceAll(request.isAudienceAll());
        coupon.getRecipients().clear();
        if (!request.isAudienceAll()) {
            Set<Long> ids = new LinkedHashSet<>(request.getCustomerIds() == null ? List.of() : request.getCustomerIds());
            if (ids.isEmpty()) throw new BusinessRuleViolationException("Choose at least one customer for this promotion");
            for (Long id : ids) {
                User customer = userRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Customer not found: " + id));
                if (customer.getRole() != Role.USER) throw new BusinessRuleViolationException("Coupon recipients must be customers");
                coupon.getRecipients().add(customer);
            }
        }
    }

    private void notifyAudience(User admin, Coupon coupon, String title, String message) {
        if (coupon.isAudienceAll()) {
            notificationService.notifyRole(Role.USER, admin, NotificationType.PROMOTION, title, message, "/cart");
        } else {
            coupon.getRecipients().forEach(user -> notificationService.notifyUser(user, admin, NotificationType.PROMOTION, title, message, "/cart"));
        }
    }

    private boolean isAudienceAllowed(Coupon coupon, User user) {
        return coupon.isAudienceAll() || coupon.getRecipients().stream().anyMatch(recipient -> recipient.getId().equals(user.getId()));
    }

    private boolean isWithinPerCustomerLimit(Coupon coupon, User user) {
        try {
            assertWithinPerCustomerLimit(coupon, user);
            return true;
        } catch (BusinessRuleViolationException ex) {
            return false;
        }
    }

    private void assertWithinPerCustomerLimit(Coupon coupon, User user) {
        Integer limit = coupon.getPerCustomerUsageLimit();
        if (limit == null) return;
        long usedByCustomer = orderRepository.countByUserIdAndCouponCodeIgnoreCase(user.getId(), coupon.getCode());
        if (usedByCustomer >= limit) {
            throw new BusinessRuleViolationException("You have already used this coupon the maximum number of times");
        }
    }

    private boolean isCurrentlyUsable(Coupon coupon) {
        try { assertCurrentlyUsable(coupon); return true; } catch (BusinessRuleViolationException ex) { return false; }
    }

    private void assertCurrentlyUsable(Coupon coupon) {
        Instant now = Instant.now();
        if (!coupon.isActive()) throw new BusinessRuleViolationException("Coupon is inactive");
        if (coupon.getStartsAt() != null && now.isBefore(coupon.getStartsAt())) throw new BusinessRuleViolationException("Coupon is not active yet");
        if (coupon.getEndsAt() != null && now.isAfter(coupon.getEndsAt())) throw new BusinessRuleViolationException("Coupon has expired");
        if (coupon.getUsageLimit() != null && coupon.getUsedCount() >= coupon.getUsageLimit()) throw new BusinessRuleViolationException("Coupon usage limit has been reached");
    }

    private String buildPromoMessage(Coupon coupon) {
        String amount = coupon.getDiscountType() == DiscountType.PERCENT
                ? coupon.getDiscountValue().stripTrailingZeros().toPlainString() + "%"
                : "$" + coupon.getDiscountValue().stripTrailingZeros().toPlainString();
        String uses = coupon.getPerCustomerUsageLimit() == null
                ? ""
                : " You can use it up to " + coupon.getPerCustomerUsageLimit() + " time(s).";
        return "Use code " + coupon.getCode() + " for " + amount + " off eligible orders." + uses;
    }

    private CouponResponse toResponse(Coupon coupon) {
        return new CouponResponse(coupon.getId(), coupon.getCode(), coupon.getDiscountType(), coupon.getDiscountValue(),
                coupon.getMinimumOrder(), coupon.isActive(), coupon.getStartsAt(), coupon.getEndsAt(), coupon.getUsageLimit(),
                coupon.getPerCustomerUsageLimit(), coupon.getUsedCount(), coupon.isAudienceAll(), coupon.getRecipients().stream().map(User::getId).sorted().toList(), coupon.getCreatedAt());
    }

    private String normalizeCode(String code) { return code.trim().toUpperCase(Locale.ROOT); }
}
