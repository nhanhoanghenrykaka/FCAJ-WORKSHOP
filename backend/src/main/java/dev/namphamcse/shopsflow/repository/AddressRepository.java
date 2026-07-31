package dev.namphamcse.shopsflow.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import dev.namphamcse.shopsflow.entity.Address;
import dev.namphamcse.shopsflow.entity.User;

public interface AddressRepository extends JpaRepository<Address, Long> {
    List<Address> findByUserOrderByDefaultAddressDescCreatedAtDesc(User user);
    Optional<Address> findByIdAndUser(Long id, User user);
    long countByUser(User user);
}
