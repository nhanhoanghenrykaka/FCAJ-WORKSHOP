CREATE UNIQUE INDEX uk_users_email_lower ON users (LOWER(email));
CREATE UNIQUE INDEX uk_categories_name_lower ON categories (LOWER(name));

CREATE INDEX idx_products_created_at ON products (created_at DESC);
CREATE INDEX idx_product_categories_category_id ON product_categories (category_id);
CREATE INDEX idx_cart_items_user_id ON cart_items (user_id);
CREATE INDEX idx_orders_user_created_at ON orders (user_id, created_at DESC);
CREATE INDEX idx_orders_status_created_at ON orders (status, created_at DESC);
CREATE INDEX idx_order_items_order_id ON order_items (order_id);
CREATE INDEX idx_order_items_product_id ON order_items (product_id);
CREATE INDEX idx_reviews_product_created_at ON reviews (product_id, created_at DESC);
