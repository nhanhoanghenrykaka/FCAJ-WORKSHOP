package dev.namphamcse.shopsflow.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import dev.namphamcse.shopsflow.entity.RegistrationEmailVerification;

public interface RegistrationEmailVerificationRepository
        extends JpaRepository<RegistrationEmailVerification, Long> {

    Optional<RegistrationEmailVerification> findByEmailIgnoreCase(String email);

    void deleteByEmailIgnoreCase(String email);
}
