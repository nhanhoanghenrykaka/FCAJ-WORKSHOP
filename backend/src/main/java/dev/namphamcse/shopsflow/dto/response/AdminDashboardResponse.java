package dev.namphamcse.shopsflow.dto.response;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public record AdminDashboardResponse(
        BigDecimal revenue,
        long totalOrders,
        long totalCustomers,
        long totalProducts,
        long lowStockProducts,
        long outOfStockProducts,
        double averageRating,
        Map<String, Long> ordersByStatus,
        List<TopProductResponse> topProducts) {
    public record TopProductResponse(Long productId, String productName, long unitsSold, BigDecimal revenue) {}
}
