package dev.namphamcse.shopsflow.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import dev.namphamcse.shopsflow.entity.SupportMessage;

public interface SupportMessageRepository extends JpaRepository<SupportMessage, Long> {
}
