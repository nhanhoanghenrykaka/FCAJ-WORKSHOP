package dev.namphamcse.shopsflow.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import dev.namphamcse.shopsflow.entity.InventoryTransaction;

public interface InventoryTransactionRepository extends JpaRepository<InventoryTransaction, Long> {
    List<InventoryTransaction> findAllByOrderByCreatedAtDesc();
    List<InventoryTransaction> findByProductIdOrderByCreatedAtDesc(Long productId);
}
