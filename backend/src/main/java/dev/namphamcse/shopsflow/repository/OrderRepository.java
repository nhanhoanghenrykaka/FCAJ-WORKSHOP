package dev.namphamcse.shopsflow.repository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import dev.namphamcse.shopsflow.entity.Order;
import dev.namphamcse.shopsflow.entity.User;
import dev.namphamcse.shopsflow.entity.enums.OrderStatus;

public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByUserOrderByCreatedAtDesc(User user);
    List<Order> findAllByOrderByCreatedAtDesc();
    long countByUserIdAndCouponCodeIgnoreCase(Long userId, String couponCode);

    @Query("select case when count(o) > 0 then true else false end from Order o join o.items i " +
           "where o.user.id = :userId and i.product.id = :productId and o.status in :statuses")
    boolean existsPurchasedProduct(@Param("userId") Long userId,
                                   @Param("productId") Long productId,
                                   @Param("statuses") Collection<OrderStatus> statuses);
}
