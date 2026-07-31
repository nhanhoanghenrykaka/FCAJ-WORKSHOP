package dev.namphamcse.shopsflow.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;
import java.util.stream.Stream;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.namphamcse.shopsflow.dto.request.ProductRequest;
import dev.namphamcse.shopsflow.dto.response.ProductResponse;
import dev.namphamcse.shopsflow.entity.Category;
import dev.namphamcse.shopsflow.entity.Product;
import dev.namphamcse.shopsflow.exception.BusinessRuleViolationException;
import dev.namphamcse.shopsflow.exception.ResourceNotFoundException;
import dev.namphamcse.shopsflow.mapper.ProductMapper;
import dev.namphamcse.shopsflow.repository.CartItemRepository;
import dev.namphamcse.shopsflow.repository.CategoryRepository;
import dev.namphamcse.shopsflow.repository.OrderItemRepository;
import dev.namphamcse.shopsflow.repository.ProductRepository;
import dev.namphamcse.shopsflow.repository.ReviewRepository;
import dev.namphamcse.shopsflow.repository.spec.ProductSpecifications;
import lombok.RequiredArgsConstructor;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class ProductService {
    private final ProductRepository productRepo;
    private final CategoryRepository categoryRepo;
    private final ReviewRepository reviewRepo;
    private final CartItemRepository cartItemRepo;
    private final OrderItemRepository orderItemRepo;

    private List<Category> resolveCategories(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }

        List<Long> uniqueIds = ids.stream()
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (uniqueIds.size() != ids.size() || uniqueIds.stream().anyMatch(id -> id <= 0)) {
            throw new IllegalArgumentException("Category IDs must be unique positive numbers");
        }

        List<Category> categories = categoryRepo.findAllById(uniqueIds);
        if (categories.size() != uniqueIds.size()) {
            throw new ResourceNotFoundException("One or more categories not found: " + uniqueIds);
        }
        return categories;
    }

    public ProductResponse getProductById(Long id) {
        Product product = productRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + id));
        return ProductMapper.toResponse(product);
    }

    public Page<ProductResponse> searchProducts(
            String keyword,
            Long categoryId,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            Pageable pageable) {
        if (minPrice != null && minPrice.signum() < 0) {
            throw new IllegalArgumentException("Minimum price cannot be negative");
        }
        if (maxPrice != null && maxPrice.signum() < 0) {
            throw new IllegalArgumentException("Maximum price cannot be negative");
        }
        if (minPrice != null && maxPrice != null && minPrice.compareTo(maxPrice) > 0) {
            throw new IllegalArgumentException("Minimum price cannot be greater than maximum price");
        }

        Specification<Product> spec = Stream.of(
                        ProductSpecifications.hasKeyword(keyword),
                        ProductSpecifications.inCategory(categoryId),
                        ProductSpecifications.priceAtLeast(minPrice),
                        ProductSpecifications.priceAtMost(maxPrice))
                .filter(Objects::nonNull)
                .reduce(Specification::and)
                .orElse((root, query, cb) -> cb.conjunction());

        return productRepo.findAll(spec, pageable).map(ProductMapper::toResponse);
    }

    @Transactional
    public ProductResponse createProduct(ProductRequest request) {
        normalizeRequest(request);
        List<Category> categories = resolveCategories(request.getCategoryIds());
        return ProductMapper.toResponse(productRepo.save(ProductMapper.toEntity(request, categories)));
    }

    @Transactional
    public ProductResponse updateProduct(Long id, ProductRequest request) {
        Product product = productRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + id));
        normalizeRequest(request);
        List<Category> categories = resolveCategories(request.getCategoryIds());
        ProductMapper.updateEntity(product, request, categories);
        return ProductMapper.toResponse(productRepo.save(product));
    }

    @Transactional
    public void deleteProduct(Long id) {
        if (!productRepo.existsById(id)) {
            throw new ResourceNotFoundException("Product not found: " + id);
        }
        if (orderItemRepo.existsByProductId(id)) {
            throw new BusinessRuleViolationException(
                    "Cannot delete a product that appears in an order. Set its stock to 0 instead.");
        }

        cartItemRepo.deleteByProductId(id);
        reviewRepo.deleteByProductId(id);
        productRepo.deleteById(id);
    }

    private void normalizeRequest(ProductRequest request) {
        request.setName(request.getName().trim());
        request.setDescription(normalizeOptionalText(request.getDescription()));
        request.setImageUrl(normalizeOptionalText(request.getImageUrl()));
    }

    private String normalizeOptionalText(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
