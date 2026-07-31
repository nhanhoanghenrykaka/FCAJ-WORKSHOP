package dev.namphamcse.shopsflow.service;

import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.namphamcse.shopsflow.dto.request.AddressRequest;
import dev.namphamcse.shopsflow.dto.request.ProfileUpdateRequest;
import dev.namphamcse.shopsflow.dto.response.AddressResponse;
import dev.namphamcse.shopsflow.dto.response.ProductResponse;
import dev.namphamcse.shopsflow.dto.response.UserResponse;
import dev.namphamcse.shopsflow.entity.Address;
import dev.namphamcse.shopsflow.entity.Product;
import dev.namphamcse.shopsflow.entity.User;
import dev.namphamcse.shopsflow.entity.WishlistItem;
import dev.namphamcse.shopsflow.entity.enums.NotificationType;
import dev.namphamcse.shopsflow.exception.ResourceNotFoundException;
import dev.namphamcse.shopsflow.exception.BusinessRuleViolationException;
import dev.namphamcse.shopsflow.mapper.ProductMapper;
import dev.namphamcse.shopsflow.mapper.UserMapper;
import dev.namphamcse.shopsflow.repository.AddressRepository;
import dev.namphamcse.shopsflow.repository.ProductRepository;
import dev.namphamcse.shopsflow.repository.UserRepository;
import dev.namphamcse.shopsflow.repository.WishlistRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AccountService {
    private final UserRepository userRepository;
    private final AddressRepository addressRepository;
    private final ProductRepository productRepository;
    private final WishlistRepository wishlistRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;

    public UserResponse getProfile(User user) {
        return UserMapper.toResponse(user);
    }

    @Transactional
    public UserResponse updateProfileImage(User user, String imageUrl) {
        user.setProfileImageUrl(imageUrl);
        userRepository.save(user);
        auditService.log(user, "PROFILE_IMAGE_UPDATED", "USER", user.getId(), user.getRole() + " updated profile image");
        return UserMapper.toResponse(user);
    }

    @Transactional
    public UserResponse updateProfile(User user, ProfileUpdateRequest request) {
        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);
        if (!email.equals(user.getEmail().toLowerCase(Locale.ROOT))) {
            throw new BusinessRuleViolationException("Email cannot be changed while signed in. Sign out and use account recovery for email changes.");
        }

        user.setName(request.getName().trim());
        user.setPhone(clean(request.getPhone()));
        user.setProfileImageUrl(clean(request.getProfileImageUrl()));
        userRepository.save(user);
        notificationService.notifyUser(user, user, NotificationType.ACCOUNT,
                "Profile updated", "Your account profile was updated.",
                user.getRole().name().equals("ADMIN") ? "/admin/profile" : "/account");
        auditService.log(user, "PROFILE_UPDATED", "USER", user.getId(), user.getRole() + " updated profile details");
        return UserMapper.toResponse(user);
    }

    public List<AddressResponse> getAddresses(User user) {
        return addressRepository.findByUserOrderByDefaultAddressDescCreatedAtDesc(user).stream()
                .map(this::toAddressResponse)
                .toList();
    }

    @Transactional
    public AddressResponse createAddress(User user, AddressRequest request) {
        Address address = new Address();
        address.setUser(user);
        applyAddress(address, request);
        if (addressRepository.countByUser(user) == 0) address.setDefaultAddress(true);
        if (address.isDefaultAddress()) clearDefault(user, null);
        Address saved = addressRepository.save(address);
        auditService.log(user, "ADDRESS_CREATED", "ADDRESS", saved.getId(), saved.getProvince());
        return toAddressResponse(saved);
    }

    @Transactional
    public AddressResponse updateAddress(User user, Long id, AddressRequest request) {
        Address address = addressRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new ResourceNotFoundException("Address not found: " + id));
        applyAddress(address, request);
        if (address.isDefaultAddress()) clearDefault(user, id);
        return toAddressResponse(addressRepository.save(address));
    }

    @Transactional
    public void deleteAddress(User user, Long id) {
        Address address = addressRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new ResourceNotFoundException("Address not found: " + id));
        boolean wasDefault = address.isDefaultAddress();
        addressRepository.delete(address);
        if (wasDefault) {
            addressRepository.findByUserOrderByDefaultAddressDescCreatedAtDesc(user).stream().findFirst()
                    .ifPresent(next -> { next.setDefaultAddress(true); addressRepository.save(next); });
        }
        auditService.log(user, "ADDRESS_DELETED", "ADDRESS", id, "Customer deleted an address");
    }

    public List<ProductResponse> getWishlist(User user) {
        return wishlistRepository.findByUserOrderByCreatedAtDesc(user).stream()
                .map(WishlistItem::getProduct)
                .map(ProductMapper::toResponse)
                .toList();
    }

    @Transactional
    public ProductResponse addWishlist(User user, Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + productId));
        wishlistRepository.findByUserIdAndProductId(user.getId(), productId)
                .orElseGet(() -> {
                    WishlistItem item = new WishlistItem();
                    item.setUser(user);
                    item.setProduct(product);
                    notificationService.notifyUser(user, user, NotificationType.WISHLIST,
                            "Added to wishlist", product.getName() + " was saved to your wishlist.", "/account#wishlist");
                    return wishlistRepository.save(item);
                });
        return ProductMapper.toResponse(product);
    }

    @Transactional
    public void removeWishlist(User user, Long productId) {
        if (!wishlistRepository.existsByUserIdAndProductId(user.getId(), productId)) {
            throw new ResourceNotFoundException("Wishlist item not found for product: " + productId);
        }
        wishlistRepository.deleteByUserIdAndProductId(user.getId(), productId);
    }

    public boolean isWishlisted(User user, Long productId) {
        return wishlistRepository.existsByUserIdAndProductId(user.getId(), productId);
    }

    public Address getOwnedAddress(User user, Long addressId) {
        return addressRepository.findByIdAndUser(addressId, user)
                .orElseThrow(() -> new ResourceNotFoundException("Address not found: " + addressId));
    }

    private void clearDefault(User user, Long exceptId) {
        for (Address address : addressRepository.findByUserOrderByDefaultAddressDescCreatedAtDesc(user)) {
            if (exceptId == null || !address.getId().equals(exceptId)) {
                address.setDefaultAddress(false);
            }
        }
    }

    private void applyAddress(Address address, AddressRequest request) {
        address.setReceiverName(request.getReceiverName().trim());
        address.setPhone(request.getPhone().trim());
        address.setLine1(request.getLine1().trim());
        address.setWard(clean(request.getWard()));
        address.setDistrict(clean(request.getDistrict()));
        address.setProvince(request.getProvince().trim());
        address.setDefaultAddress(request.isDefaultAddress());
    }

    private AddressResponse toAddressResponse(Address address) {
        return new AddressResponse(address.getId(), address.getReceiverName(), address.getPhone(), address.getLine1(),
                address.getWard(), address.getDistrict(), address.getProvince(), address.isDefaultAddress(), address.getCreatedAt());
    }

    private String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
