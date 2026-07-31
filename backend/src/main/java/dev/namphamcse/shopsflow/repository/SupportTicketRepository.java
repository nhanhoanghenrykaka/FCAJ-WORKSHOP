package dev.namphamcse.shopsflow.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import dev.namphamcse.shopsflow.entity.SupportTicket;
import dev.namphamcse.shopsflow.entity.User;

public interface SupportTicketRepository extends JpaRepository<SupportTicket, Long> {
    List<SupportTicket> findByUserOrderByUpdatedAtDesc(User user);
    List<SupportTicket> findAllByOrderByUpdatedAtDesc();
}
