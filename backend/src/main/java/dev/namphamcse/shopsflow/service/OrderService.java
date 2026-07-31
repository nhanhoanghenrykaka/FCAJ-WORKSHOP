package dev.namphamcse.shopsflow.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.namphamcse.shopsflow.dto.request.CheckoutRequest;
import dev.namphamcse.shopsflow.dto.request.ReturnRequest;
import dev.namphamcse.shopsflow.dto.request.ShipOrderRequest;
import dev.namphamcse.shopsflow.dto.response.OrderHistoryResponse;
import dev.namphamcse.shopsflow.dto.response.OrderResponse;
import dev.namphamcse.shopsflow.entity.Address;
import dev.namphamcse.shopsflow.entity.CartItem;
import dev.namphamcse.shopsflow.entity.Coupon;
import dev.namphamcse.shopsflow.entity.Order;
import dev.namphamcse.shopsflow.entity.OrderItem;
import dev.namphamcse.shopsflow.entity.Product;
import dev.namphamcse.shopsflow.entity.User;
import dev.namphamcse.shopsflow.entity.enums.InventoryTransactionType;
import dev.namphamcse.shopsflow.entity.enums.NotificationType;
import dev.namphamcse.shopsflow.entity.enums.OrderStatus;
import dev.namphamcse.shopsflow.entity.enums.Role;
import dev.namphamcse.shopsflow.exception.BusinessRuleViolationException;
import dev.namphamcse.shopsflow.exception.ResourceNotFoundException;
import dev.namphamcse.shopsflow.mapper.OrderMapper;
import dev.namphamcse.shopsflow.repository.CartItemRepository;
import dev.namphamcse.shopsflow.repository.OrderRepository;
import dev.namphamcse.shopsflow.repository.ProductRepository;
import lombok.RequiredArgsConstructor;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class OrderService {
    private static final BigDecimal STANDARD_FEE = BigDecimal.ZERO;
    private static final BigDecimal EXPRESS_FEE = new BigDecimal("4.00");
    private static final EnumSet<OrderStatus> RETURN_ADMIN_STATUSES = EnumSet.of(
            OrderStatus.RETURN_APPROVED, OrderStatus.RETURN_REJECTED,
            OrderStatus.RETURN_RECEIVED, OrderStatus.REFUNDED);

    private final OrderRepository orderRepo;
    private final CartItemRepository cartItemRepo;
    private final ProductRepository productRepo;
    private final NotificationService notificationService;
    private final AccountService accountService;
    private final CouponService couponService;
    private final InventoryService inventoryService;
    private final OrderHistoryService historyService;
    private final AuditService auditService;

    @Transactional
    public OrderResponse placeOrder(User user) {
        return placeOrder(user, null);
    }

    @Transactional
    public OrderResponse placeOrder(User user, CheckoutRequest checkout) {
        List<CartItem> cartItems = cartItemRepo.findByUser(user);
        if (cartItems.isEmpty()) throw new BusinessRuleViolationException("Cannot place an order with an empty cart");

        Order order = new Order();
        order.setUser(user);
        order.setStatus(OrderStatus.PENDING);
        order.setItems(new ArrayList<>());

        if (checkout != null) {
            Address address = accountService.getOwnedAddress(user, checkout.getAddressId());
            order.setReceiverName(address.getReceiverName());
            order.setReceiverPhone(address.getPhone());
            order.setShippingAddress(formatAddress(address));
            order.setShippingMethod(normalizeShipping(checkout.getShippingMethod()));
        } else {
            order.setShippingMethod("STANDARD");
        }

        BigDecimal subtotal = BigDecimal.ZERO;
        for (CartItem cartItem : cartItems) {
            Product product = cartItem.getProduct();
            if (product.getStockQuantity() < cartItem.getQuantity()) {
                throw new BusinessRuleViolationException("Insufficient stock for product: " + product.getName());
            }
            product.setStockQuantity(product.getStockQuantity() - cartItem.getQuantity());
            productRepo.save(product);
            BigDecimal priceAtPurchase = product.getPrice();
            order.getItems().add(new OrderItem(order, product, cartItem.getQuantity(), priceAtPurchase));
            subtotal = subtotal.add(priceAtPurchase.multiply(BigDecimal.valueOf(cartItem.getQuantity())));
        }

        Coupon coupon = checkout == null ? null : couponService.requireUsable(checkout.getCouponCode(), user);
        BigDecimal discount = couponService.calculateDiscount(coupon, subtotal);
        BigDecimal shippingFee = checkout == null
                ? BigDecimal.ZERO
                : calculateShippingFee(order.getShippingMethod(), subtotal.subtract(discount));
        BigDecimal total = subtotal.subtract(discount).add(shippingFee).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
        order.setDiscountAmount(discount);
        order.setShippingFee(shippingFee);
        order.setCouponCode(coupon == null ? null : coupon.getCode());
        order.setTotalAmount(total);

        Order savedOrder = orderRepo.save(order);
        couponService.markUsed(coupon);
        cartItemRepo.deleteByUser(user);

        historyService.record(savedOrder, null, OrderStatus.PENDING, user, "Order placed");
        for (OrderItem item : savedOrder.getItems()) {
            inventoryService.record(item.getProduct(), -item.getQuantity(), InventoryTransactionType.ORDER_RESERVED,
                    savedOrder.getId(), user, "Reserved for order #" + savedOrder.getId());
            inventoryService.checkLowStock(item.getProduct(), user);
        }

        notificationService.notifyRole(Role.ADMIN, user, NotificationType.ORDER,
                "New order #" + savedOrder.getId(),
                user.getName() + " placed a new order. Total: " + savedOrder.getTotalAmount() + ".", "/admin");
        auditService.log(user, "ORDER_PLACED", "ORDER", savedOrder.getId(), "Total " + savedOrder.getTotalAmount());
        return OrderMapper.toOrderResponse(savedOrder);
    }

    public List<OrderResponse> getUserOrders(User user) {
        return orderRepo.findByUserOrderByCreatedAtDesc(user).stream().map(OrderMapper::toOrderResponse).toList();
    }

    public OrderResponse getOrderById(User user, Long id) {
        return OrderMapper.toOrderResponse(requireVisibleOrder(user, id));
    }

    public List<OrderHistoryResponse> getHistory(User user, Long id) {
        requireVisibleOrder(user, id);
        return historyService.get(id);
    }

    @Transactional
    public OrderResponse updateOrderStatusByAdmin(User admin, Long id, OrderStatus nextStatus) {
        Order order = requireOrder(id);
        OrderStatus current = order.getStatus();
        if (current == nextStatus) return OrderMapper.toOrderResponse(order);
        if (current == OrderStatus.PENDING && nextStatus == OrderStatus.CANCELLED) {
            restoreStock(order, admin, InventoryTransactionType.ORDER_CANCELLED, "Admin cancelled order");
            changeStatus(order, nextStatus, admin, "Cancelled by admin");
            notificationService.notifyUser(order.getUser(), admin, NotificationType.ORDER,
                    "Order #" + id + " cancelled", "An admin cancelled your order. Reserved stock was restored.",
                    "/orders/" + id);
            return OrderMapper.toOrderResponse(order);
        }
        if (current == OrderStatus.PAID && nextStatus == OrderStatus.SHIPPED) {
            return shipOrder(admin, id, new ShipOrderRequest());
        }
        throw new BusinessRuleViolationException("Admin cannot change order status from " + current + " to " + nextStatus);
    }

    @Transactional
    public OrderResponse shipOrder(User admin, Long id, ShipOrderRequest request) {
        Order order = requireOrder(id);
        if (order.getStatus() != OrderStatus.PAID) {
            throw new BusinessRuleViolationException("Only a PAID order can be shipped");
        }
        order.setCarrier(null);
        order.setTrackingNumber(null);
        changeStatus(order, OrderStatus.SHIPPED, admin, "Marked as shipped");
        notificationService.notifyUser(order.getUser(), admin, NotificationType.ORDER,
                "Order #" + id + " shipped",
                "Your order has been shipped. Shipping method: " + order.getShippingMethod() + ". Confirm Delivered after it arrives.",
                "/orders/" + id);
        return OrderMapper.toOrderResponse(order);
    }

    @Transactional
    public OrderResponse confirmDelivered(User user, Long id) {
        Order order = requireOwnedOrder(user, id);
        if (order.getStatus() == OrderStatus.DELIVERED) return OrderMapper.toOrderResponse(order);
        if (order.getStatus() != OrderStatus.SHIPPED) {
            throw new BusinessRuleViolationException("Only a shipped order can be confirmed as delivered");
        }
        changeStatus(order, OrderStatus.DELIVERED, user, "Customer confirmed delivery");
        notificationService.notifyRole(Role.ADMIN, user, NotificationType.ORDER,
                "Order #" + id + " delivered", user.getName() + " confirmed that order #" + id + " has arrived.", "/admin");
        return OrderMapper.toOrderResponse(order);
    }

    @Transactional
    public OrderResponse requestReturn(User user, Long id, ReturnRequest request) {
        Order order = requireOwnedOrder(user, id);
        if (order.getStatus() != OrderStatus.DELIVERED && order.getStatus() != OrderStatus.RETURN_REJECTED) {
            throw new BusinessRuleViolationException("A return can be requested only after delivery");
        }
        order.setReturnReason(request.getReason().trim());
        changeStatus(order, OrderStatus.RETURN_REQUESTED, user, "Return requested: " + order.getReturnReason());
        notificationService.notifyRole(Role.ADMIN, user, NotificationType.RETURN,
                "Return requested for order #" + id, user.getName() + " requested a return: " + order.getReturnReason(),
                "/admin/operations#returns");
        return OrderMapper.toOrderResponse(order);
    }

    @Transactional
    public OrderResponse processReturn(User admin, Long id, OrderStatus nextStatus) {
        Order order = requireOrder(id);
        if (!RETURN_ADMIN_STATUSES.contains(nextStatus)) {
            throw new BusinessRuleViolationException("Invalid return status: " + nextStatus);
        }

        OrderStatus current = order.getStatus();
        boolean allowed =
                (current == OrderStatus.RETURN_REQUESTED
                        && (nextStatus == OrderStatus.RETURN_APPROVED || nextStatus == OrderStatus.RETURN_REJECTED))
                || (current == OrderStatus.RETURNED && nextStatus == OrderStatus.RETURN_RECEIVED)
                || (current == OrderStatus.RETURN_RECEIVED && nextStatus == OrderStatus.REFUNDED);

        if (!allowed) {
            throw new BusinessRuleViolationException(
                    "Cannot change return status from " + current + " to " + nextStatus);
        }

        if (nextStatus == OrderStatus.RETURN_RECEIVED) {
            restoreStock(order, admin, InventoryTransactionType.RETURNED,
                    "Admin confirmed returned item received and restocked");
        }

        String note = switch (nextStatus) {
            case RETURN_APPROVED -> "Return request approved by admin";
            case RETURN_REJECTED -> "Return request rejected by admin";
            case RETURN_RECEIVED -> "Admin confirmed the returned item was received";
            case REFUNDED -> "Admin confirmed the refund was sent";
            default -> "Return workflow updated by admin";
        };
        changeStatus(order, nextStatus, admin, note);

        String message = switch (nextStatus) {
            case RETURN_APPROVED -> "Your return request was approved. Use Return product from Orders or Order details after you send it back.";
            case RETURN_REJECTED -> "Your return request was rejected.";
            case RETURN_RECEIVED -> "The shop confirmed that your returned item was received. Your refund will be processed next.";
            case REFUNDED -> "The shop marked your refund as sent. Please confirm after the refund reaches you.";
            default -> "Your return request status changed to " + nextStatus + ".";
        };
        notificationService.notifyUser(order.getUser(), admin, NotificationType.RETURN,
                "Order #" + id + " · " + nextStatus.name().replace('_', ' ').toLowerCase(),
                message, "/orders/" + id);
        return OrderMapper.toOrderResponse(order);
    }

    @Transactional
    public OrderResponse confirmItemReturned(User user, Long id) {
        Order order = requireOwnedOrder(user, id);
        if (order.getStatus() != OrderStatus.RETURN_APPROVED) {
            throw new BusinessRuleViolationException(
                    "The item can be returned only after the return request is approved");
        }

        changeStatus(order, OrderStatus.RETURNED, user,
                "Customer confirmed the item was returned to the shop");
        notificationService.notifyRole(Role.ADMIN, user, NotificationType.RETURN,
                "Order #" + id + " item returned",
                user.getName() + " confirmed that the item for order #" + id
                        + " was returned. Confirm receipt before refunding.",
                "/admin/operations#returns");
        return OrderMapper.toOrderResponse(order);
    }

    @Transactional
    public OrderResponse confirmRefundReceived(User user, Long id) {
        Order order = requireOwnedOrder(user, id);
        if (order.getStatus() != OrderStatus.REFUNDED) {
            throw new BusinessRuleViolationException(
                    "A refund can be confirmed only after the shop marks it as refunded");
        }

        changeStatus(order, OrderStatus.REFUND_CONFIRMED, user,
                "Customer confirmed the refund was received");
        notificationService.notifyRole(Role.ADMIN, user, NotificationType.RETURN,
                "Refund confirmed for order #" + id,
                user.getName() + " confirmed that the refund for order #" + id + " was received.",
                "/admin/operations#returns");
        return OrderMapper.toOrderResponse(order);
    }

    public List<OrderResponse> findAllOrders() {
        return orderRepo.findAllByOrderByCreatedAtDesc().stream().map(OrderMapper::toOrderResponse).toList();
    }

    private void changeStatus(Order order, OrderStatus next, User actor, String note) {
        OrderStatus from = order.getStatus();
        order.setStatus(next);
        orderRepo.save(order);
        historyService.record(order, from, next, actor, note);
        auditService.log(actor, "ORDER_STATUS_CHANGED", "ORDER", order.getId(), from + " -> " + next);
    }

    private void restoreStock(Order order, User actor, InventoryTransactionType type, String note) {
        for (OrderItem item : order.getItems()) {
            Product product = item.getProduct();
            product.setStockQuantity(product.getStockQuantity() + item.getQuantity());
            productRepo.save(product);
            inventoryService.record(product, item.getQuantity(), type, order.getId(), actor, note);
        }
    }

    private BigDecimal calculateShippingFee(String shippingMethod, BigDecimal afterDiscount) {
        return "EXPRESS".equals(shippingMethod) ? EXPRESS_FEE : STANDARD_FEE;
    }

    private String normalizeShipping(String value) {
        return "EXPRESS".equalsIgnoreCase(value) ? "EXPRESS" : "STANDARD";
    }

    private String formatAddress(Address address) {
        List<String> parts = new ArrayList<>();
        parts.add(address.getLine1());
        if (address.getWard() != null) parts.add(address.getWard());
        if (address.getDistrict() != null) parts.add(address.getDistrict());
        parts.add(address.getProvince());
        return String.join(", ", parts);
    }

    private Order requireVisibleOrder(User user, Long id) {
        Order order = requireOrder(id);
        if (user.getRole() != Role.ADMIN && !order.getUser().getId().equals(user.getId())) {
            throw new ResourceNotFoundException("Order not found: " + id);
        }
        return order;
    }

    private Order requireOwnedOrder(User user, Long id) {
        Order order = requireOrder(id);
        if (!order.getUser().getId().equals(user.getId())) throw new ResourceNotFoundException("Order not found: " + id);
        return order;
    }

    private Order requireOrder(Long id) {
        return orderRepo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Order not found: " + id));
    }

    private String clean(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private String valueOr(String value, String fallback) { return value == null || value.isBlank() ? fallback : value; }
}
