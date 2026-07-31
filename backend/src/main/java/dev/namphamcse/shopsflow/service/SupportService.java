package dev.namphamcse.shopsflow.service;

import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.namphamcse.shopsflow.dto.request.SupportMessageRequest;
import dev.namphamcse.shopsflow.dto.request.SupportTicketRequest;
import dev.namphamcse.shopsflow.dto.response.SupportMessageResponse;
import dev.namphamcse.shopsflow.dto.response.SupportTicketResponse;
import dev.namphamcse.shopsflow.entity.Category;
import dev.namphamcse.shopsflow.entity.Product;
import dev.namphamcse.shopsflow.entity.SupportMessage;
import dev.namphamcse.shopsflow.entity.SupportTicket;
import dev.namphamcse.shopsflow.entity.User;
import dev.namphamcse.shopsflow.entity.enums.NotificationType;
import dev.namphamcse.shopsflow.entity.enums.Role;
import dev.namphamcse.shopsflow.entity.enums.SupportTicketStatus;
import dev.namphamcse.shopsflow.exception.BusinessRuleViolationException;
import dev.namphamcse.shopsflow.exception.ResourceNotFoundException;
import dev.namphamcse.shopsflow.repository.CategoryRepository;
import dev.namphamcse.shopsflow.repository.ProductRepository;
import dev.namphamcse.shopsflow.repository.SupportMessageRepository;
import dev.namphamcse.shopsflow.repository.SupportTicketRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SupportService {
    private final SupportTicketRepository ticketRepository;
    private final SupportMessageRepository messageRepository;
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;

    public List<SupportTicketResponse> getForUser(User user) {
        return ticketRepository.findByUserOrderByUpdatedAtDesc(user).stream().map(this::toResponse).toList();
    }

    public List<SupportTicketResponse> getAll() {
        return ticketRepository.findAllByOrderByUpdatedAtDesc().stream().map(this::toResponse).toList();
    }

    @Transactional
    public SupportTicketResponse create(User user, SupportTicketRequest request) {
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + request.getCategoryId()));
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + request.getProductId()));
        boolean belongs = product.getCategories().stream().anyMatch(value -> value.getId().equals(category.getId()));
        if (!belongs) throw new BusinessRuleViolationException("The selected product does not belong to the selected category");

        SupportTicket ticket = new SupportTicket();
        ticket.setUser(user);
        ticket.setCategory(category);
        ticket.setProduct(product);
        ticket.setSubject(request.getSubject().trim());
        SupportTicket saved = ticketRepository.save(ticket);
        addMessageInternal(saved, user, request.getMessage().trim());
        notificationService.notifyRole(Role.ADMIN, user, NotificationType.SUPPORT,
                "New support ticket #" + saved.getId(),
                user.getName() + " needs help with " + product.getName() + " (" + category.getName() + ").",
                "/admin/operations#support");
        auditService.log(user, "SUPPORT_TICKET_CREATED", "SUPPORT_TICKET", saved.getId(), product.getName());
        return toResponse(saved);
    }

    @Transactional
    public SupportTicketResponse addMessage(User sender, Long ticketId, SupportMessageRequest request) {
        SupportTicket ticket = requireVisibleTicket(sender, ticketId);
        addMessageInternal(ticket, sender, request.getMessage().trim());
        ticket.setUpdatedAt(Instant.now());
        if (sender.getRole() == Role.ADMIN) {
            ticket.setStatus(SupportTicketStatus.ANSWERED);
            notificationService.notifyUser(ticket.getUser(), sender, NotificationType.SUPPORT,
                    "Support replied to ticket #" + ticket.getId(),
                    "An admin replied about " + productLabel(ticket) + ".", "/support");
        } else {
            ticket.setStatus(SupportTicketStatus.OPEN);
            notificationService.notifyRole(Role.ADMIN, sender, NotificationType.SUPPORT,
                    "New message on ticket #" + ticket.getId(), sender.getName() + " sent a support message.",
                    "/admin/operations#support");
        }
        ticketRepository.save(ticket);
        return toResponse(ticket);
    }

    @Transactional
    public SupportTicketResponse close(User actor, Long ticketId) {
        SupportTicket ticket = requireVisibleTicket(actor, ticketId);
        ticket.setStatus(SupportTicketStatus.CLOSED);
        ticket.setUpdatedAt(Instant.now());
        ticketRepository.save(ticket);
        auditService.log(actor, "SUPPORT_TICKET_CLOSED", "SUPPORT_TICKET", ticketId, ticket.getSubject());
        return toResponse(ticket);
    }

    private SupportTicket requireVisibleTicket(User actor, Long ticketId) {
        SupportTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Support ticket not found: " + ticketId));
        if (actor.getRole() != Role.ADMIN && !ticket.getUser().getId().equals(actor.getId())) {
            throw new ResourceNotFoundException("Support ticket not found: " + ticketId);
        }
        return ticket;
    }

    private SupportMessage addMessageInternal(SupportTicket ticket, User sender, String body) {
        SupportMessage message = new SupportMessage();
        message.setTicket(ticket);
        message.setSender(sender);
        message.setMessage(body);
        SupportMessage saved = messageRepository.save(message);
        ticket.getMessages().add(saved);
        return saved;
    }

    private SupportTicketResponse toResponse(SupportTicket ticket) {
        List<SupportMessageResponse> messages = ticket.getMessages().stream()
                .map(message -> new SupportMessageResponse(message.getId(), message.getSender().getId(),
                        message.getSender().getName(), message.getSender().getRole(), message.getMessage(), message.getCreatedAt()))
                .toList();
        return new SupportTicketResponse(ticket.getId(), ticket.getUser().getId(), ticket.getUser().getName(),
                ticket.getUser().getEmail(), ticket.getOrder() == null ? null : ticket.getOrder().getId(),
                ticket.getCategory() == null ? null : ticket.getCategory().getId(),
                ticket.getCategory() == null ? null : ticket.getCategory().getName(),
                ticket.getProduct() == null ? null : ticket.getProduct().getId(),
                ticket.getProduct() == null ? null : ticket.getProduct().getName(),
                ticket.getSubject(), ticket.getStatus(), ticket.getCreatedAt(), ticket.getUpdatedAt(), messages);
    }

    private String productLabel(SupportTicket ticket) {
        return ticket.getProduct() == null ? "your ticket" : ticket.getProduct().getName();
    }
}
