-- Expand the return workflow so customer and admin each confirm their own step.
ALTER TABLE orders DROP CONSTRAINT IF EXISTS chk_orders_status;
ALTER TABLE orders ADD CONSTRAINT chk_orders_status CHECK (status IN (
    'PENDING','PAID','SHIPPED','DELIVERED','CANCELLED',
    'RETURN_REQUESTED','RETURN_APPROVED','RETURN_REJECTED','RETURNED',
    'RETURN_RECEIVED','REFUNDED','REFUND_CONFIRMED'
));
