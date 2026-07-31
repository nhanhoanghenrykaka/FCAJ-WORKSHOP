package dev.namphamcse.shopsflow.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.namphamcse.shopsflow.dto.response.AuditLogResponse;
import dev.namphamcse.shopsflow.entity.AuditLog;
import dev.namphamcse.shopsflow.entity.User;
import dev.namphamcse.shopsflow.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuditService {
    private final AuditLogRepository auditLogRepository;

    @Transactional
    public void log(User actor, String action, String entityType, Long entityId, String details) {
        AuditLog log = new AuditLog();
        log.setActor(actor);
        log.setActorName(actor == null ? "Shopsflow" : actor.getName());
        log.setActorRole(actor == null ? null : actor.getRole());
        log.setAction(action);
        log.setEntityType(entityType);
        log.setEntityId(entityId);
        log.setDetails(details);
        auditLogRepository.save(log);
    }

    @Transactional(readOnly = true)
    public List<AuditLogResponse> getRecent() {
        return auditLogRepository.findTop200ByOrderByCreatedAtDesc().stream()
                .map(log -> new AuditLogResponse(
                        log.getId(),
                        log.getActor() == null ? null : log.getActor().getId(),
                        log.getActorName(),
                        log.getActorRole(),
                        log.getAction(),
                        log.getEntityType(),
                        log.getEntityId(),
                        log.getDetails(),
                        log.getCreatedAt()))
                .toList();
    }
}
