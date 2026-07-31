package dev.namphamcse.shopsflow.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
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

import dev.namphamcse.shopsflow.dto.request.AddToCartRequest;
import dev.namphamcse.shopsflow.dto.request.UpdateCartItemRequest;
import dev.namphamcse.shopsflow.dto.response.CartResponse;
import dev.namphamcse.shopsflow.entity.CartItem;
import dev.namphamcse.shopsflow.entity.Product;
import dev.namphamcse.shopsflow.entity.User;
import dev.namphamcse.shopsflow.exception.BusinessRuleViolationException;
import dev.namphamcse.shopsflow.exception.ResourceNotFoundException;
import dev.namphamcse.shopsflow.repository.CartItemRepository;
import dev.namphamcse.shopsflow.repository.ProductRepository;

@ExtendWith(MockitoExtension.class)
class CartServiceTest {

    @Mock
    CartItemRepository cartItemRepo;
    @Mock
    ProductRepository productRepo;

    @Mock
    NotificationService notificationService;

    @InjectMocks
    CartService cartService;

    private User user;
    private Product product;

    @BeforeEach
    void setUp() {
        user = new User("Nam", "n@x.com", "pw");
        user.setId(1L);

        product = new Product("Book", "desc", new BigDecimal("10"), null, 5);
        product.setId(100L);
    }

    @Test
    void getCart_returnsMappedCart_forUser() {
        CartItem item = new CartItem(user, product, 2);
        when(cartItemRepo.findByUser(user)).thenReturn(List.of(item));

        CartResponse response = cartService.getCart(user);

        assertEquals(1, response.getItems().size());
        assertEquals(2, response.getTotalItems());
        assertEquals(new BigDecimal("20"), response.getTotalPrice());
        assertEquals(100L, response.getItems().get(0).getProductId());
        verify(cartItemRepo).findByUser(user);
    }

    @Test
    void addToCart_throws_whenProductNotFound() {
        AddToCartRequest req = new AddToCartRequest();
        req.setProductId(404L);
        req.setQuantity(1);

        when(productRepo.findById(404L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> cartService.addToCart(user, req));

        verify(cartItemRepo, never()).save(any());
    }

    @Test
    void addToCart_createsNewItem_whenNoneExists() {
        AddToCartRequest req = new AddToCartRequest();
        req.setProductId(100L);
        req.setQuantity(1);

        when(productRepo.findById(100L)).thenReturn(Optional.of(product));
        when(cartItemRepo.findByUserAndProduct(user, product))
                .thenReturn(Optional.empty());
        when(cartItemRepo.findByUser(user))
                .thenReturn(List.of());

        cartService.addToCart(user, req);

        ArgumentCaptor<CartItem> captor = ArgumentCaptor.forClass(CartItem.class);
        verify(cartItemRepo).save(captor.capture());
        assertEquals(1, captor.getValue().getQuantity());
        assertSame(user, captor.getValue().getUser());
        assertSame(product, captor.getValue().getProduct());
    }

    @Test
    void addToCart_incrementsQuantity_whenItemExists() {
        AddToCartRequest req = new AddToCartRequest();
        req.setProductId(100L);
        req.setQuantity(2);

        CartItem existing = new CartItem(user, product, 1);
        when(productRepo.findById(100L)).thenReturn(Optional.of(product));
        when(cartItemRepo.findByUserAndProduct(user, product))
                .thenReturn(Optional.of(existing));
        when(cartItemRepo.findByUser(user)).thenReturn(List.of(existing));

        cartService.addToCart(user, req);

        assertEquals(3, existing.getQuantity());
        verify(cartItemRepo).save(existing);
    }

    @Test
    void addToCart_throws_whenQuantityExceedsStock() {
        AddToCartRequest req = new AddToCartRequest();
        req.setProductId(100L);
        req.setQuantity(99);

        when(productRepo.findById(100L)).thenReturn(Optional.of(product));
        when(cartItemRepo.findByUserAndProduct(user, product))
                .thenReturn(Optional.empty());

        assertThrows(BusinessRuleViolationException.class,
                () -> cartService.addToCart(user, req));

        verify(cartItemRepo, never()).save(any());
    }

    @Test
    void updateItem_throws_whenCartItemNotFound() {
        UpdateCartItemRequest req = new UpdateCartItemRequest();
        req.setQuantity(2);

        when(cartItemRepo.findById(50L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> cartService.updateItem(user, 50L, req));

        verify(cartItemRepo, never()).save(any());
    }

    @Test
    void updateItem_throws_whenQuantityExceedsStock() {
        CartItem item = new CartItem(user, product, 1);
        item.setId(50L);

        UpdateCartItemRequest req = new UpdateCartItemRequest();
        req.setQuantity(99);

        when(cartItemRepo.findById(50L)).thenReturn(Optional.of(item));

        assertThrows(BusinessRuleViolationException.class,
                () -> cartService.updateItem(user, 50L, req));

        verify(cartItemRepo, never()).save(any());
    }

    @Test
    void updateItem_updatesQuantity_whenHappyPath() {
        CartItem item = new CartItem(user, product, 1);
        item.setId(50L);

        UpdateCartItemRequest req = new UpdateCartItemRequest();
        req.setQuantity(3);

        when(cartItemRepo.findById(50L)).thenReturn(Optional.of(item));
        when(cartItemRepo.findByUser(user)).thenReturn(List.of(item));

        CartResponse response = cartService.updateItem(user, 50L, req);

        assertEquals(3, item.getQuantity());
        verify(cartItemRepo).save(item);
        assertEquals(3, response.getTotalItems());
    }

    @Test
    void updateItem_throwsNotFound_whenItemBelongsToAnotherUser() {
        User otherUser = new User("Other", "o@x.com", "pw");
        otherUser.setId(2L); // different ID

        CartItem someoneElsesItem = new CartItem(otherUser, product, 1);
        someoneElsesItem.setId(50L);

        UpdateCartItemRequest req = new UpdateCartItemRequest();
        req.setQuantity(3);

        when(cartItemRepo.findById(50L))
                .thenReturn(Optional.of(someoneElsesItem));

        assertThrows(ResourceNotFoundException.class, // NOT AccessDenied!
                () -> cartService.updateItem(user, 50L, req));

        verify(cartItemRepo, never()).save(any());
    }

    @Test
    void removeItem_throws_whenCartItemNotFound() {
        when(cartItemRepo.findById(50L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> cartService.removeItem(user, 50L));

        verify(cartItemRepo, never()).delete(any());
    }

    @Test
    void removeItem_deletes_whenHappyPath() {
        CartItem item = new CartItem(user, product, 1);
        item.setId(50L);

        when(cartItemRepo.findById(50L)).thenReturn(Optional.of(item));
        when(cartItemRepo.findByUser(user)).thenReturn(List.of());

        cartService.removeItem(user, 50L);

        verify(cartItemRepo).delete(item);
    }

    @Test
    void removeItem_throwsNotFound_andDoesNotDelete_whenItemBelongsToAnotherUser() {
        User otherUser = new User("Other", "o@x.com", "pw");
        otherUser.setId(2L);
        CartItem someoneElsesItem = new CartItem(otherUser, product, 1);
        someoneElsesItem.setId(50L);

        when(cartItemRepo.findById(50L))
                .thenReturn(Optional.of(someoneElsesItem));

        assertThrows(ResourceNotFoundException.class,
                () -> cartService.removeItem(user, 50L));

        verify(cartItemRepo, never()).delete(any());
    }

    @Test
    void clearCart_delegatesToRepository() {
        cartService.clearCart(user);
        verify(cartItemRepo).deleteByUser(user);
    }
}
