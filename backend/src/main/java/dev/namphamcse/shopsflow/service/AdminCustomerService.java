package dev.namphamcse.shopsflow.service;

import java.time.Instant;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.namphamcse.shopsflow.dto.response.UserResponse;
import dev.namphamcse.shopsflow.entity.User;
import dev.namphamcse.shopsflow.entity.enums.Role;
import dev.namphamcse.shopsflow.exception.BusinessRuleViolationException;
import dev.namphamcse.shopsflow.exception.ResourceNotFoundException;
import dev.namphamcse.shopsflow.mapper.UserMapper;
import dev.namphamcse.shopsflow.repository.UserRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminCustomerService {
    private final UserRepository userRepository;
    private final AuditService auditService;

    @Transactional
    public UserResponse setBanned(User admin, Long customerId, boolean banned, String reason) {
        User customer = userRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found: " + customerId));
        if (customer.getRole() != Role.USER) {
            throw new BusinessRuleViolationException("Only customer accounts can be banned");
        }
        customer.setBanned(banned);
        customer.setBannedAt(banned ? Instant.now() : null);
        customer.setBannedReason(banned ? clean(reason, "Vi phạm quy định của Shopsflow") : null);
        userRepository.save(customer);
        auditService.log(admin, banned ? "CUSTOMER_BANNED" : "CUSTOMER_UNBANNED", "USER", customerId,
                banned ? customer.getBannedReason() : "Customer access restored");
        return UserMapper.toResponse(customer);
    }

    private String clean(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
