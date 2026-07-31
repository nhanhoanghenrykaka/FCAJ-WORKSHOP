package dev.namphamcse.shopsflow.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.orm.ObjectOptimisticLockingFailureException;

import dev.namphamcse.shopsflow.dto.response.OrderResponse;
import dev.namphamcse.shopsflow.entity.CartItem;
import dev.namphamcse.shopsflow.entity.Order;
import dev.namphamcse.shopsflow.entity.Product;
import dev.namphamcse.shopsflow.entity.User;
import dev.namphamcse.shopsflow.entity.enums.OrderStatus;
import dev.namphamcse.shopsflow.entity.enums.Role;
import dev.namphamcse.shopsflow.exception.BusinessRuleViolationException;
import dev.namphamcse.shopsflow.exception.ResourceNotFoundException;
import dev.namphamcse.shopsflow.repository.CartItemRepository;
import dev.namphamcse.shopsflow.repository.OrderRepository;
import dev.namphamcse.shopsflow.repository.ProductRepository;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    OrderRepository orderRepo;
    @Mock
    CartItemRepository cartItemRepo;
    @Mock
    ProductRepository productRepo;
    @Mock
    NotificationService notificationService;
    @Mock
    AccountService accountService;
    @Mock
    CouponService couponService;
    @Mock
    InventoryService inventoryService;
    @Mock
    OrderHistoryService historyService;
    @Mock
    AuditService auditService;

    @InjectMocks
    OrderService orderService;

    private User user;
    private User admin;
    private Product product;

    @BeforeEach
    void setUp() {
        user = new User("Nam", "n@x.com", "pw");
        user.setId(1L);
        user.setRole(Role.USER);

        admin = new User("Admin", "admin@x.com", "pw");
        admin.setId(99L);
        admin.setRole(Role.ADMIN);

        product = new Product("Book", "desc", new BigDecimal("10"), null, 5);
        product.setId(100L);

        lenient().when(couponService.calculateDiscount(isNull(), any(BigDecimal.class))).thenReturn(BigDecimal.ZERO);
    }


    @Test
    void placeOrder_throws_whenCartIsEmpty() {
        when(cartItemRepo.findByUser(user)).thenReturn(List.of());

        assertThrows(BusinessRuleViolationException.class,
                () -> orderService.placeOrder(user));

        verify(orderRepo, never()).save(any());
        verify(productRepo, never()).save(any());
        verify(cartItemRepo, never()).deleteByUser(any());
    }

    @Test
    void placeOrder_throws_whenInsufficientStock() {
        CartItem item = new CartItem(user, product, 99); // stock is 5
        when(cartItemRepo.findByUser(user)).thenReturn(List.of(item));

        assertThrows(BusinessRuleViolationException.class,
                () -> orderService.placeOrder(user));

        verify(orderRepo, never()).save(any());
        verify(productRepo, never()).save(any());
        verify(cartItemRepo, never()).deleteByUser(any());
    }

    @Test
    void placeOrder_decrementsStock_savesOrder_clearsCart_onHappyPath() {
        CartItem item = new CartItem(user, product, 2);
        when(cartItemRepo.findByUser(user)).thenReturn(List.of(item));
        when(orderRepo.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        OrderResponse response = orderService.placeOrder(user);

        assertEquals(3, product.getStockQuantity()); // 5 - 2
        verify(productRepo).save(product);

        ArgumentCaptor<Order> captor = ArgumentCaptor.forClass(Order.class);
        verify(orderRepo).save(captor.capture());
        Order saved = captor.getValue();
        assertEquals(user, saved.getUser());
        assertEquals(OrderStatus.PENDING, saved.getStatus());
        assertEquals(new BigDecimal("20.00"), saved.getTotalAmount()); // service normalizes money to 2 decimals
        assertEquals(1, saved.getItems().size());

        verify(cartItemRepo).deleteByUser(user);

        assertEquals(OrderStatus.PENDING, response.getStatus());
        assertEquals(new BigDecimal("20.00"), response.getTotalAmount());
    }

    @Test
    void placeOrder_sumsTotalAcrossMultipleItems() {
        Product other = new Product("Pen", "desc", new BigDecimal("3"), null, 10);
        other.setId(200L);

        CartItem item1 = new CartItem(user, product, 2); // 10 * 2 = 20
        CartItem item2 = new CartItem(user, other, 4);   //  3 * 4 = 12

        when(cartItemRepo.findByUser(user)).thenReturn(List.of(item1, item2));
        when(orderRepo.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        orderService.placeOrder(user);

        ArgumentCaptor<Order> captor = ArgumentCaptor.forClass(Order.class);
        verify(orderRepo).save(captor.capture());
        assertEquals(new BigDecimal("32.00"), captor.getValue().getTotalAmount());
        assertEquals(2, captor.getValue().getItems().size());

        verify(productRepo).save(product);
        verify(productRepo).save(other);
        assertEquals(3, product.getStockQuantity());
        assertEquals(6, other.getStockQuantity());
    }

    @Test
    void placeOrder_propagatesOptimisticLockingFailure_whenProductVersionConflict() {
        CartItem item = new CartItem(user, product, 2);
        ObjectOptimisticLockingFailureException conflict =
                new ObjectOptimisticLockingFailureException(Product.class, product.getId());

        when(cartItemRepo.findByUser(user)).thenReturn(List.of(item));
        when(productRepo.save(product)).thenThrow(conflict);

        ObjectOptimisticLockingFailureException ex = assertThrows(
                ObjectOptimisticLockingFailureException.class,
                () -> orderService.placeOrder(user));

        assertEquals(conflict, ex);
        verify(orderRepo, never()).save(any());
        verify(cartItemRepo, never()).deleteByUser(any());
    }


    @Test
    void getUserOrders_returnsMappedList() {
        Order order = new Order(user, new BigDecimal("20"));
        order.setId(7L);
        order.setStatus(OrderStatus.PENDING);

        when(orderRepo.findByUserOrderByCreatedAtDesc(user)).thenReturn(List.of(order));

        List<OrderResponse> result = orderService.getUserOrders(user);

        assertEquals(1, result.size());
        assertEquals(7L, result.get(0).getId());
        verify(orderRepo).findByUserOrderByCreatedAtDesc(user);
    }


    @Test
    void getOrderById_throws_whenNotFound() {
        when(orderRepo.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> orderService.getOrderById(user, 999L));
    }

    @Test
    void getOrderById_throwsNotFound_whenNonAdminViewsAnotherUsersOrder() {
        User otherUser = new User("Other", "o@x.com", "pw");
        otherUser.setId(2L);

        Order order = new Order(otherUser, new BigDecimal("20"));
        order.setId(7L);

        when(orderRepo.findById(7L)).thenReturn(Optional.of(order));

        assertThrows(ResourceNotFoundException.class,
                () -> orderService.getOrderById(user, 7L));
    }

    @Test
    void getOrderById_returnsOrder_whenOwner() {
        Order order = new Order(user, new BigDecimal("20"));
        order.setId(7L);

        when(orderRepo.findById(7L)).thenReturn(Optional.of(order));

        OrderResponse response = orderService.getOrderById(user, 7L);
        assertEquals(7L, response.getId());
    }

    @Test
    void getOrderById_returnsOrder_whenAdminViewsAnotherUsersOrder() {
        User admin = new User("Admin", "a@x.com", "pw");
        admin.setId(99L);
        admin.setRole(Role.ADMIN);

        Order order = new Order(user, new BigDecimal("20"));
        order.setId(7L);

        when(orderRepo.findById(7L)).thenReturn(Optional.of(order));

        OrderResponse response = orderService.getOrderById(admin, 7L);
        assertEquals(7L, response.getId());
    }


    @Test
    void updateOrderStatusByAdmin_throws_whenNotFound() {
        when(orderRepo.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> orderService.updateOrderStatusByAdmin(admin, 999L, OrderStatus.SHIPPED));
    }

    @Test
    void updateOrderStatusByAdmin_allowsPendingToCancelled() {
        Order order = new Order(user, new BigDecimal("20"));
        order.setId(7L);
        order.setStatus(OrderStatus.PENDING);

        when(orderRepo.findById(7L)).thenReturn(Optional.of(order));

        OrderResponse response = orderService.updateOrderStatusByAdmin(admin, 7L, OrderStatus.CANCELLED);

        assertEquals(OrderStatus.CANCELLED, order.getStatus());
        assertEquals(OrderStatus.CANCELLED, response.getStatus());
    }

    @Test
    void updateOrderStatusByAdmin_allowsPaidToShipped() {
        Order order = new Order(user, new BigDecimal("20"));
        order.setId(7L);
        order.setStatus(OrderStatus.PAID);

        when(orderRepo.findById(7L)).thenReturn(Optional.of(order));

        OrderResponse response = orderService.updateOrderStatusByAdmin(admin, 7L, OrderStatus.SHIPPED);

        assertEquals(OrderStatus.SHIPPED, order.getStatus());
        assertEquals(OrderStatus.SHIPPED, response.getStatus());
    }

    @Test
    void updateOrderStatusByAdmin_rejectsPendingToPaid() {
        Order order = new Order(user, new BigDecimal("20"));
        order.setId(7L);
        order.setStatus(OrderStatus.PENDING);

        when(orderRepo.findById(7L)).thenReturn(Optional.of(order));

        assertThrows(BusinessRuleViolationException.class,
                () -> orderService.updateOrderStatusByAdmin(admin, 7L, OrderStatus.PAID));
        assertEquals(OrderStatus.PENDING, order.getStatus());
    }

    @Test
    void updateOrderStatusByAdmin_rejectsShippedToDelivered() {
        Order order = new Order(user, new BigDecimal("20"));
        order.setId(7L);
        order.setStatus(OrderStatus.SHIPPED);

        when(orderRepo.findById(7L)).thenReturn(Optional.of(order));

        assertThrows(BusinessRuleViolationException.class,
                () -> orderService.updateOrderStatusByAdmin(admin, 7L, OrderStatus.DELIVERED));
        assertEquals(OrderStatus.SHIPPED, order.getStatus());
    }

    @Test
    void updateOrderStatusByAdmin_rejectsShippedBackToPaid() {
        Order order = new Order(user, new BigDecimal("20"));
        order.setId(7L);
        order.setStatus(OrderStatus.SHIPPED);

        when(orderRepo.findById(7L)).thenReturn(Optional.of(order));

        assertThrows(BusinessRuleViolationException.class,
                () -> orderService.updateOrderStatusByAdmin(admin, 7L, OrderStatus.PAID));
        assertEquals(OrderStatus.SHIPPED, order.getStatus());
    }

    @Test
    void confirmDelivered_allowsOwnerToMoveShippedToDelivered() {
        Order order = new Order(user, new BigDecimal("20"));
        order.setId(7L);
        order.setStatus(OrderStatus.SHIPPED);

        when(orderRepo.findById(7L)).thenReturn(Optional.of(order));

        OrderResponse response = orderService.confirmDelivered(user, 7L);

        assertEquals(OrderStatus.DELIVERED, order.getStatus());
        assertEquals(OrderStatus.DELIVERED, response.getStatus());
    }

    @Test
    void confirmDelivered_rejectsOrderOwnedByAnotherUser() {
        User otherUser = new User("Other", "o@x.com", "pw");
        otherUser.setId(2L);
        otherUser.setRole(Role.USER);

        Order order = new Order(otherUser, new BigDecimal("20"));
        order.setId(7L);
        order.setStatus(OrderStatus.SHIPPED);

        when(orderRepo.findById(7L)).thenReturn(Optional.of(order));

        assertThrows(ResourceNotFoundException.class, () -> orderService.confirmDelivered(user, 7L));
        assertEquals(OrderStatus.SHIPPED, order.getStatus());
    }

    @Test
    void confirmDelivered_rejectsOrderThatIsNotShipped() {
        Order order = new Order(user, new BigDecimal("20"));
        order.setId(7L);
        order.setStatus(OrderStatus.PAID);

        when(orderRepo.findById(7L)).thenReturn(Optional.of(order));

        assertThrows(BusinessRuleViolationException.class, () -> orderService.confirmDelivered(user, 7L));
        assertEquals(OrderStatus.PAID, order.getStatus());
    }


    @Test
    void findAllOrders_returnsMappedList() {
        Order o1 = new Order(user, new BigDecimal("20"));
        o1.setId(1L);
        Order o2 = new Order(user, new BigDecimal("5"));
        o2.setId(2L);

        when(orderRepo.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(o1, o2));

        List<OrderResponse> result = orderService.findAllOrders();

        assertEquals(2, result.size());
        verify(orderRepo).findAllByOrderByCreatedAtDesc();
    }
}
