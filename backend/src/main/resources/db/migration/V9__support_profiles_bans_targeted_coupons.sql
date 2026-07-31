ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR(1200);
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP(6) WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_reason VARCHAR(500);

ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS product_id BIGINT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS category_id BIGINT;
ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS fk_support_ticket_product;
ALTER TABLE support_tickets ADD CONSTRAINT fk_support_ticket_product
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS fk_support_ticket_category;
ALTER TABLE support_tickets ADD CONSTRAINT fk_support_ticket_category
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_support_ticket_product ON support_tickets(product_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_category ON support_tickets(category_id);

ALTER TABLE coupons ADD COLUMN IF NOT EXISTS audience_all BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS coupon_recipients (
    coupon_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    PRIMARY KEY (coupon_id, user_id),
    CONSTRAINT fk_coupon_recipient_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
    CONSTRAINT fk_coupon_recipient_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_coupon_recipients_user ON coupon_recipients(user_id);
