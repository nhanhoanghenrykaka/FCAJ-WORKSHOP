package dev.namphamcse.shopsflow.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.namphamcse.shopsflow.dto.response.AdminDashboardResponse;
import dev.namphamcse.shopsflow.dto.response.CustomerSummaryResponse;
import dev.namphamcse.shopsflow.entity.Order;
import dev.namphamcse.shopsflow.entity.OrderItem;
import dev.namphamcse.shopsflow.entity.User;
import dev.namphamcse.shopsflow.entity.enums.OrderStatus;
import dev.namphamcse.shopsflow.entity.enums.Role;
import dev.namphamcse.shopsflow.repository.OrderRepository;
import dev.namphamcse.shopsflow.repository.ProductRepository;
import dev.namphamcse.shopsflow.repository.ReviewRepository;
import dev.namphamcse.shopsflow.repository.UserRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminInsightsService {
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final ReviewRepository reviewRepository;

    public List<CustomerSummaryResponse> customers() {
        List<CustomerSummaryResponse> result = new ArrayList<>();
        for (User user : userRepository.findAllByRole(Role.USER)) {
            List<Order> orders = orderRepository.findByUserOrderByCreatedAtDesc(user);
            BigDecimal totalSpent = orders.stream()
                    .filter(order -> countsAsRevenue(order.getStatus()))
                    .map(Order::getTotalAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            result.add(new CustomerSummaryResponse(user.getId(), user.getName(), user.getEmail(), user.getPhone(),
                    user.getProfileImageUrl(), user.isBanned(), user.getBannedReason(), user.getCreatedAt(),
                    orders.size(), totalSpent, reviewRepository.countByUserId(user.getId())));
        }
        return result.stream().sorted(Comparator.comparing(CustomerSummaryResponse::createdAt,
                Comparator.nullsLast(Comparator.reverseOrder()))).toList();
    }

    private boolean countsAsRevenue(OrderStatus status) {
        return status == OrderStatus.PAID
                || status == OrderStatus.SHIPPED
                || status == OrderStatus.DELIVERED
                || status == OrderStatus.RETURN_REQUESTED
                || status == OrderStatus.RETURN_APPROVED
                || status == OrderStatus.RETURN_REJECTED;
    }

    public AdminDashboardResponse dashboard() {
        List<Order> orders = orderRepository.findAll();
        BigDecimal revenue = orders.stream()
                .filter(order -> countsAsRevenue(order.getStatus()))
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long low = productRepository.findAll().stream().filter(p -> p.getStockQuantity() > 0 && p.getStockQuantity() <= InventoryService.LOW_STOCK_THRESHOLD).count();
        long out = productRepository.findAll().stream().filter(p -> p.getStockQuantity() == 0).count();
        double avg = reviewRepository.findAll().stream().mapToInt(r -> r.getStars()).average().orElse(0);

        Map<String, Long> byStatus = new LinkedHashMap<>();
        for (OrderStatus status : OrderStatus.values()) {
            byStatus.put(status.name(), orders.stream().filter(order -> order.getStatus() == status).count());
        }

        record Sales(long units, BigDecimal revenue, String name) {}
        Map<Long, Sales> sales = new LinkedHashMap<>();
        for (Order order : orders) {
            if (!countsAsRevenue(order.getStatus())) continue;
            for (OrderItem item : order.getItems()) {
                Sales current = sales.getOrDefault(item.getProduct().getId(), new Sales(0, BigDecimal.ZERO, item.getProduct().getName()));
                BigDecimal line = item.getPriceAtPurchase().multiply(BigDecimal.valueOf(item.getQuantity()));
                sales.put(item.getProduct().getId(), new Sales(current.units() + item.getQuantity(), current.revenue().add(line), current.name()));
            }
        }
        List<AdminDashboardResponse.TopProductResponse> top = sales.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue().units(), a.getValue().units()))
                .limit(5)
                .map(entry -> new AdminDashboardResponse.TopProductResponse(entry.getKey(), entry.getValue().name(),
                        entry.getValue().units(), entry.getValue().revenue()))
                .toList();

        return new AdminDashboardResponse(revenue, orders.size(), userRepository.findAllByRole(Role.USER).size(),
                productRepository.count(), low, out, avg, byStatus, top);
    }
}
