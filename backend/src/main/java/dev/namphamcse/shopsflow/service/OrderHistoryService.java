package dev.namphamcse.shopsflow.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.namphamcse.shopsflow.dto.response.OrderHistoryResponse;
import dev.namphamcse.shopsflow.entity.Order;
import dev.namphamcse.shopsflow.entity.OrderStatusHistory;
import dev.namphamcse.shopsflow.entity.User;
import dev.namphamcse.shopsflow.entity.enums.OrderStatus;
import dev.namphamcse.shopsflow.repository.OrderStatusHistoryRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class OrderHistoryService {
    private final OrderStatusHistoryRepository historyRepository;

    @Transactional
    public void record(Order order, OrderStatus fromStatus, OrderStatus toStatus, User actor, String note) {
        OrderStatusHistory history = new OrderStatusHistory();
        history.setOrder(order);
        history.setFromStatus(fromStatus);
        history.setToStatus(toStatus);
        history.setChangedBy(actor);
        history.setChangedByName(actor == null ? "System" : actor.getName());
        history.setNote(note);
        historyRepository.save(history);
    }

    @Transactional(readOnly = true)
    public List<OrderHistoryResponse> get(Long orderId) {
        return historyRepository.findByOrderIdOrderByCreatedAtAsc(orderId).stream()
                .map(item -> new OrderHistoryResponse(item.getId(), item.getFromStatus(), item.getToStatus(),
                        item.getChangedByName(), item.getNote(), item.getCreatedAt()))
                .toList();
    }
}
