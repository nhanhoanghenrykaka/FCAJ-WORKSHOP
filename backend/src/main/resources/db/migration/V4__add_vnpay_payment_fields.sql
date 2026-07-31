ALTER TABLE orders ADD COLUMN IF NOT EXISTS vnpay_trans_id VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_orders_vnpay_trans_id ON orders (vnpay_trans_id);
