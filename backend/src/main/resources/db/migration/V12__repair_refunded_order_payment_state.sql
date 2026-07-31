-- Repair legacy/stale orders that were already in the return/refund workflow
-- but were accidentally persisted as PENDING. The latest return-related
-- history event is the source of truth for these rows.
WITH latest_return_state AS (
    SELECT DISTINCT ON (order_id)
           order_id,
           to_status
    FROM order_status_history
    WHERE to_status IN (
        'RETURN_REQUESTED',
        'RETURN_APPROVED',
        'RETURN_REJECTED',
        'RETURNED',
        'RETURN_RECEIVED',
        'REFUNDED',
        'REFUND_CONFIRMED'
    )
    ORDER BY order_id, created_at DESC, id DESC
)
UPDATE orders o
SET status = latest_return_state.to_status
FROM latest_return_state
WHERE o.id = latest_return_state.order_id
  AND o.status = 'PENDING';
