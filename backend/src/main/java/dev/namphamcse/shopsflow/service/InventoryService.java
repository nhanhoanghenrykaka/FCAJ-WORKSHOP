package dev.namphamcse.shopsflow.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.namphamcse.shopsflow.dto.request.InventoryAdjustmentRequest;
import dev.namphamcse.shopsflow.dto.response.InventoryTransactionResponse;
import dev.namphamcse.shopsflow.entity.InventoryTransaction;
import dev.namphamcse.shopsflow.entity.Product;
import dev.namphamcse.shopsflow.entity.User;
import dev.namphamcse.shopsflow.entity.enums.InventoryTransactionType;
import dev.namphamcse.shopsflow.entity.enums.NotificationType;
import dev.namphamcse.shopsflow.entity.enums.Role;
import dev.namphamcse.shopsflow.exception.BusinessRuleViolationException;
import dev.namphamcse.shopsflow.exception.ResourceNotFoundException;
import dev.namphamcse.shopsflow.repository.InventoryTransactionRepository;
import dev.namphamcse.shopsflow.repository.ProductRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InventoryService {
    public static final int LOW_STOCK_THRESHOLD = 5;

    private final InventoryTransactionRepository inventoryRepository;
    private final ProductRepository productRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;

    public List<InventoryTransactionResponse> getAll() {
        return inventoryRepository.findAllByOrderByCreatedAtDesc().stream().map(this::toResponse).toList();
    }

    public List<InventoryTransactionResponse> getForProduct(Long productId) {
        return inventoryRepository.findByProductIdOrderByCreatedAtDesc(productId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public void recordInitialStock(User admin, Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + productId));
        if (product.getStockQuantity() > 0) {
            record(product, product.getStockQuantity(), InventoryTransactionType.RESTOCK,
                    null, admin, "Initial stock when product was created");
        }
        checkLowStock(product, admin);
    }

    @Transactional
    public void recordProductStockEdit(User admin, Long productId, int previousStock, int currentStock) {
        if (previousStock == currentStock) return;
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + productId));
        int change = currentStock - previousStock;
        record(product, change, InventoryTransactionType.MANUAL_ADJUSTMENT,
                null, admin, "Stock changed from " + previousStock + " to " + currentStock + " in product editor");
        checkLowStock(product, admin);
        auditService.log(admin, "INVENTORY_ADJUSTED", "PRODUCT", productId,
                "Stock changed from " + previousStock + " to " + currentStock + " in product editor");
    }

    @Transactional
    public InventoryTransactionResponse adjust(User admin, Long productId, InventoryAdjustmentRequest request) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + productId));
        int next = product.getStockQuantity() + request.getQuantityChange();
        if (next < 0) throw new BusinessRuleViolationException("Stock cannot be negative");
        product.setStockQuantity(next);
        productRepository.save(product);
        InventoryTransaction tx = record(product, request.getQuantityChange(), InventoryTransactionType.MANUAL_ADJUSTMENT,
                null, admin, request.getNote());
        checkLowStock(product, admin);
        auditService.log(admin, "INVENTORY_ADJUSTED", "PRODUCT", productId,
                "Stock change " + request.getQuantityChange() + ", current " + next);
        return toResponse(tx);
    }

    @Transactional
    public InventoryTransaction record(Product product, int quantityChange, InventoryTransactionType type,
                                       Long referenceId, User actor, String note) {
        InventoryTransaction tx = new InventoryTransaction();
        tx.setProduct(product);
        tx.setQuantityChange(quantityChange);
        tx.setType(type);
        tx.setReferenceId(referenceId);
        tx.setActor(actor);
        tx.setNote(note);
        return inventoryRepository.save(tx);
    }

    public void checkLowStock(Product product, User actor) {
        if (product.getStockQuantity() == 0) {
            notificationService.notifyRole(Role.ADMIN, actor, NotificationType.INVENTORY,
                    "Out of stock: " + product.getName(),
                    product.getName() + " has no stock remaining.", "/admin/operations#inventory");
        } else if (product.getStockQuantity() <= LOW_STOCK_THRESHOLD) {
            notificationService.notifyRole(Role.ADMIN, actor, NotificationType.INVENTORY,
                    "Low stock: " + product.getName(),
                    product.getName() + " has only " + product.getStockQuantity() + " unit(s) remaining.",
                    "/admin/operations#inventory");
        }
    }

    private InventoryTransactionResponse toResponse(InventoryTransaction tx) {
        return new InventoryTransactionResponse(tx.getId(), tx.getProduct().getId(), tx.getProduct().getName(),
                tx.getQuantityChange(), tx.getType(), tx.getReferenceId(),
                tx.getActor() == null ? "System" : tx.getActor().getName(), tx.getNote(), tx.getCreatedAt());
    }
}
