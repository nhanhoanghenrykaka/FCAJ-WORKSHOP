package dev.namphamcse.shopsflow.config;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import dev.namphamcse.shopsflow.entity.Category;
import dev.namphamcse.shopsflow.entity.Order;
import dev.namphamcse.shopsflow.entity.OrderItem;
import dev.namphamcse.shopsflow.entity.Product;
import dev.namphamcse.shopsflow.entity.User;
import dev.namphamcse.shopsflow.entity.enums.OrderStatus;
import dev.namphamcse.shopsflow.entity.enums.Role;
import dev.namphamcse.shopsflow.repository.CategoryRepository;
import dev.namphamcse.shopsflow.repository.OrderRepository;
import dev.namphamcse.shopsflow.repository.ProductRepository;
import dev.namphamcse.shopsflow.repository.UserRepository;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.seed-admin.email:}")
    private String adminEmail;

    @Value("${app.seed-admin.password:}")
    private String adminPassword;

    @Value("${app.seed-admin.name:Admin}")
    private String adminName;

    @Value("${app.seed-demo.enabled:false}")
    private boolean seedDemoData;

    @Value("${app.seed-demo.user-email:customer@shopsflow.com}")
    private String demoUserEmail;

    @Value("${app.seed-demo.user-password:Customer123!}")
    private String demoUserPassword;

    @Override
    @Transactional
    public void run(String... args) {
        seedAdmin();
        if (seedDemoData) {
            seedDemoCatalogAndOrder();
        }
    }

    private void seedAdmin() {
        if (adminEmail == null || adminPassword == null
                || adminEmail.isBlank() || adminPassword.isBlank()) {
            return;
        }

        if (userRepository.findByEmailIgnoreCase(adminEmail.trim()).isEmpty()) {
            User admin = new User();
            admin.setName(adminName.trim());
            admin.setEmail(adminEmail.trim().toLowerCase());
            admin.setPassword(passwordEncoder.encode(adminPassword));
            admin.setRole(Role.ADMIN);
            userRepository.save(admin);
        }
    }

    private void seedDemoCatalogAndOrder() {
        List<Category> categories = seedCategories();
        List<Product> products = seedProducts(categories);
        User customer = seedDemoCustomer();

        if (orderRepository.count() == 0 && !products.isEmpty()) {
            Product product = products.get(0);
            Order order = new Order();
            order.setUser(customer);
            order.setStatus(OrderStatus.PENDING);
            order.setTotalAmount(product.getPrice());
            order.setItems(new ArrayList<>(List.of(new OrderItem(order, product, 1, product.getPrice()))));
            orderRepository.save(order);

            if (product.getStockQuantity() > 0) {
                product.setStockQuantity(product.getStockQuantity() - 1);
                productRepository.save(product);
            }
        }
    }

    private List<Category> seedCategories() {
        return List.of("Audio", "Keyboards", "Lighting", "Accessories").stream()
                .map(name -> categoryRepository.findByNameIgnoreCase(name)
                        .orElseGet(() -> categoryRepository.save(new Category(name))))
                .toList();
    }

    private List<Product> seedProducts(List<Category> categories) {
        if (productRepository.count() > 0) {
            return productRepository.findAll();
        }

        Category audio = category(categories, "Audio");
        Category keyboards = category(categories, "Keyboards");
        Category lighting = category(categories, "Lighting");
        Category accessories = category(categories, "Accessories");

        Product headphones = product(
                "Studio Headphones",
                "Closed-back monitoring headphones for focused desk work.",
                "129.00",
                18,
                List.of(audio));
        Product keyboard = product(
                "Compact Mechanical Keyboard",
                "A compact hot-swappable keyboard with tactile switches.",
                "94.00",
                14,
                List.of(keyboards));
        Product lamp = product(
                "Adjustable Desk Lamp",
                "Warm-to-cool task lighting with a compact weighted base.",
                "72.00",
                20,
                List.of(lighting));
        Product hub = product(
                "USB-C Desk Hub",
                "Seven-port aluminum hub for displays, storage and charging.",
                "59.00",
                24,
                List.of(accessories));
        Product speaker = product(
                "Desktop Monitor Speaker",
                "A compact powered speaker designed for near-field listening.",
                "149.00",
                10,
                List.of(audio));
        Product wristRest = product(
                "Walnut Wrist Rest",
                "Solid wood wrist support finished with natural oil.",
                "36.00",
                30,
                List.of(keyboards, accessories));

        return productRepository.saveAll(List.of(
                headphones, keyboard, lamp, hub, speaker, wristRest));
    }

    private User seedDemoCustomer() {
        return userRepository.findByEmailIgnoreCase(demoUserEmail.trim())
                .orElseGet(() -> {
                    User user = new User(
                            "Demo Customer",
                            demoUserEmail.trim().toLowerCase(),
                            passwordEncoder.encode(demoUserPassword));
                    return userRepository.save(user);
                });
    }

    private Category category(List<Category> categories, String name) {
        return categories.stream()
                .filter(category -> category.getName().equalsIgnoreCase(name))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Missing demo category: " + name));
    }

    private Product product(
            String name,
            String description,
            String price,
            int stockQuantity,
            List<Category> categories) {
        Product product = new Product(
                name,
                description,
                new BigDecimal(price),
                null,
                stockQuantity);
        product.setCategories(categories);
        return product;
    }
}
