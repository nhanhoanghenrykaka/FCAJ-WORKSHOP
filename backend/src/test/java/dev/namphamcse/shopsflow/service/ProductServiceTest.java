package dev.namphamcse.shopsflow.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.InjectMocks;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import dev.namphamcse.shopsflow.dto.request.ProductRequest;
import dev.namphamcse.shopsflow.dto.response.ProductResponse;
import dev.namphamcse.shopsflow.entity.Category;
import dev.namphamcse.shopsflow.entity.Product;
import dev.namphamcse.shopsflow.exception.ResourceNotFoundException;
import dev.namphamcse.shopsflow.repository.CartItemRepository;
import dev.namphamcse.shopsflow.repository.CategoryRepository;
import dev.namphamcse.shopsflow.repository.OrderItemRepository;
import dev.namphamcse.shopsflow.repository.ProductRepository;
import dev.namphamcse.shopsflow.repository.ReviewRepository;

@ExtendWith(MockitoExtension.class)
class ProductServiceTest {

    @Mock
    ProductRepository productRepo;
    @Mock
    CategoryRepository categoryRepo;
    @Mock
    ReviewRepository reviewRepo;
    @Mock
    CartItemRepository cartItemRepo;
    @Mock
    OrderItemRepository orderItemRepo;

    @InjectMocks
    ProductService productService;

    private Category books;
    private Product product;

    @BeforeEach
    void setUp() {
        books = new Category();
        books.setId(1L);
        books.setName("Books");

        product = new Product("Book", "desc", new BigDecimal("10"), null, 5);
        product.setId(100L);
    }


    @Test
    void getProductById_returns_whenFound() {
        when(productRepo.findById(100L)).thenReturn(Optional.of(product));

        ProductResponse response = productService.getProductById(100L);

        assertEquals(100L, response.getId());
        assertEquals("Book", response.getName());
    }

    @Test
    void getProductById_throws_whenNotFound() {
        when(productRepo.findById(999L)).thenReturn(Optional.empty());

        ResourceNotFoundException ex = assertThrows(
                ResourceNotFoundException.class,
                () -> productService.getProductById(999L));

        assertTrue(ex.getMessage().contains("999"));
    }


    @Test
    void searchProducts_delegatesToRepoAndMapsResult() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Product> page = new PageImpl<>(List.of(product));

        when(productRepo.findAll(ArgumentMatchers.<Specification<Product>>any(), eq(pageable))).thenReturn(page);

        Page<ProductResponse> result = productService.searchProducts(
                "book", 1L, new BigDecimal("1"), new BigDecimal("100"), pageable);

        assertEquals(1, result.getTotalElements());
        assertEquals(100L, result.getContent().get(0).getId());
        verify(productRepo).findAll(ArgumentMatchers.<Specification<Product>>any(), eq(pageable));
    }

    @Test
    void searchProducts_passesNullFilters_whenNotProvided() {
        Pageable pageable = PageRequest.of(0, 5);
        when(productRepo.findAll(ArgumentMatchers.<Specification<Product>>any(), eq(pageable)))
                .thenReturn(new PageImpl<>(List.of()));

        Page<ProductResponse> result = productService.searchProducts(
                null, null, null, null, pageable);

        assertEquals(0, result.getTotalElements());
        verify(productRepo).findAll(ArgumentMatchers.<Specification<Product>>any(), eq(pageable));
    }


    @Test
    void createProduct_savesAndReturns_withNoCategories() {
        ProductRequest req = buildRequest("Book", new BigDecimal("10"), 5, null);

        when(productRepo.save(any(Product.class))).thenAnswer(inv -> {
            Product p = inv.getArgument(0);
            p.setId(42L);
            return p;
        });

        ProductResponse response = productService.createProduct(req);

        assertEquals(42L, response.getId());
        assertEquals("Book", response.getName());
        verify(categoryRepo, never()).findAllById(any());

        ArgumentCaptor<Product> captor = ArgumentCaptor.forClass(Product.class);
        verify(productRepo).save(captor.capture());
        assertEquals(0, captor.getValue().getCategories().size());
    }

    @Test
    void createProduct_savesAndReturns_withCategories() {
        ProductRequest req = buildRequest("Book", new BigDecimal("10"), 5, List.of(1L));

        when(categoryRepo.findAllById(List.of(1L))).thenReturn(List.of(books));
        when(productRepo.save(any(Product.class))).thenAnswer(inv -> {
            Product p = inv.getArgument(0);
            p.setId(42L);
            return p;
        });

        ProductResponse response = productService.createProduct(req);

        assertEquals(42L, response.getId());
        assertEquals(1, response.getCategories().size());
        assertEquals("Books", response.getCategories().get(0).getName());
    }

    @Test
    void createProduct_throws_whenCategoryMissing() {
        ProductRequest req = buildRequest("Book", new BigDecimal("10"), 5, List.of(1L, 2L));

        when(categoryRepo.findAllById(List.of(1L, 2L))).thenReturn(List.of(books)); // only 1 of 2

        assertThrows(ResourceNotFoundException.class,
                () -> productService.createProduct(req));

        verify(productRepo, never()).save(any());
    }


    @Test
    void updateProduct_throws_whenProductNotFound() {
        ProductRequest req = buildRequest("New", new BigDecimal("5"), 3, null);
        when(productRepo.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> productService.updateProduct(999L, req));

        verify(productRepo, never()).save(any());
    }

    @Test
    void updateProduct_throws_whenCategoryMissing() {
        ProductRequest req = buildRequest("New", new BigDecimal("5"), 3, List.of(1L, 2L));

        when(productRepo.findById(100L)).thenReturn(Optional.of(product));
        when(categoryRepo.findAllById(List.of(1L, 2L))).thenReturn(List.of(books));

        assertThrows(ResourceNotFoundException.class,
                () -> productService.updateProduct(100L, req));

        verify(productRepo, never()).save(any());
    }

    @Test
    void updateProduct_updatesAndReturns_onHappyPath() {
        ProductRequest req = buildRequest("Updated", new BigDecimal("20"), 8, List.of(1L));

        when(productRepo.findById(100L)).thenReturn(Optional.of(product));
        when(categoryRepo.findAllById(List.of(1L))).thenReturn(List.of(books));
        when(productRepo.save(any(Product.class))).thenAnswer(inv -> inv.getArgument(0));

        ProductResponse response = productService.updateProduct(100L, req);

        assertEquals("Updated", response.getName());
        assertEquals(new BigDecimal("20"), response.getPrice());
        assertEquals(8, response.getStockQuantity());
        assertEquals(1, response.getCategories().size());

        ArgumentCaptor<Product> captor = ArgumentCaptor.forClass(Product.class);
        verify(productRepo).save(captor.capture());
        assertEquals("Updated", captor.getValue().getName());
    }


    @Test
    void deleteProduct_throws_whenNotFound() {
        when(productRepo.existsById(999L)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class,
                () -> productService.deleteProduct(999L));

        verify(reviewRepo, never()).deleteByProductId(any());
        verify(productRepo, never()).deleteById(any());
    }

    @Test
    void deleteProduct_deletes_whenExists() {
        when(productRepo.existsById(100L)).thenReturn(true);

        productService.deleteProduct(100L);

        InOrder inOrder = inOrder(cartItemRepo, reviewRepo, productRepo);
        inOrder.verify(cartItemRepo).deleteByProductId(100L);
        inOrder.verify(reviewRepo).deleteByProductId(100L);
        inOrder.verify(productRepo).deleteById(100L);
    }


    private ProductRequest buildRequest(String name, BigDecimal price, int stock, List<Long> categoryIds) {
        ProductRequest req = new ProductRequest();
        req.setName(name);
        req.setDescription("desc");
        req.setPrice(price);
        req.setImageUrl(null);
        req.setStockQuantity(stock);
        req.setCategoryIds(categoryIds);
        return req;
    }
}
