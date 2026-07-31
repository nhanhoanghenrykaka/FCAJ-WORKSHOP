import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "../../api/client";
import {
  confirmOrderDelivered,
  confirmRefundReceived,
  confirmReturnedItem,
  createReview,
  deleteReview,
  getOrder,
  getOrderHistory,
  getProductReviews,
  getVNPayCheckoutUrl,
  requestOrderReturn,
  updateReview,
} from "../../api/storeApi";
import { EmptyState } from "../../components/common/EmptyState";
import { Loading } from "../../components/common/Loading";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import type { Order, OrderHistory, Review } from "../../types";
import { formatCurrency, formatDate } from "../../utils/format";
import { useAuth } from "../../hooks/useAuth";
import { broadcastOrdersChanged, subscribeToOrderChanges } from "../../utils/orderSync";

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/^./, (char) => char.toUpperCase());
}

const REVIEWABLE_STATUSES = new Set([
  "DELIVERED",
  "RETURN_REQUESTED",
  "RETURN_APPROVED",
  "RETURN_REJECTED",
  "RETURNED",
  "RETURN_RECEIVED",
  "REFUNDED",
  "REFUND_CONFIRMED",
]);

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const orderId = Number(id);
  const [order, setOrder] = useState<Order | null>(null);
  const [history, setHistory] = useState<OrderHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmKind, setConfirmKind] = useState<"delivered" | "deleteReview" | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [reviewsByProduct, setReviewsByProduct] = useState<Record<number, Review[]>>({});
  const [selectedReviewProductId, setSelectedReviewProductId] = useState<number | null>(null);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    if (!Number.isInteger(orderId) || orderId <= 0) {
      setLoading(false);
      return;
    }
    let disposed = false;
    async function load() {
      try {
        const [orderData, historyData] = await Promise.all([getOrder(orderId), getOrderHistory(orderId)]);
        if (disposed) return;

        setOrder(orderData);
        setHistory(historyData);
        setSelectedReviewProductId((current) => {
          if (current && orderData.items.some((item) => item.productId === current)) return current;
          return orderData.items[0]?.productId ?? null;
        });

        if (!isAdmin && REVIEWABLE_STATUSES.has(orderData.status)) {
          const uniqueProductIds = [...new Set(orderData.items.map((item) => item.productId))];
          const reviewEntries = await Promise.all(
            uniqueProductIds.map(async (productId) => [productId, await getProductReviews(productId)] as const),
          );
          if (!disposed) setReviewsByProduct(Object.fromEntries(reviewEntries));
        } else if (!disposed) {
          setReviewsByProduct({});
        }
      } catch (error) {
        if (!disposed) toast.error(getApiErrorMessage(error, "Could not load this order."));
      } finally {
        if (!disposed) setLoading(false);
      }
    }
    void load();
    const unsubscribe = subscribeToOrderChanges(() => void load());
    const interval = window.setInterval(() => document.visibilityState === "visible" && void load(), 2500);
    return () => { disposed = true; unsubscribe(); window.clearInterval(interval); };
  }, [isAdmin, orderId]);

  const selectedItem = order?.items.find((item) => item.productId === selectedReviewProductId) ?? null;
  const selectedProductReviews = selectedReviewProductId ? (reviewsByProduct[selectedReviewProductId] ?? []) : [];
  const ownReview = selectedProductReviews.find((review) => review.userId === user?.id);

  useEffect(() => {
    setStars(ownReview?.stars ?? 5);
    setComment(ownReview?.comment ?? "");
  }, [ownReview?.comment, ownReview?.id, ownReview?.stars, selectedReviewProductId]);

  async function pay() {
    if (!order) return;
    setBusy(true);
    try {
      const url = await getVNPayCheckoutUrl(order.id);
      if (url) window.location.href = url;
      else toast.error("VNPay is not available right now.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not start VNPay."));
    } finally { setBusy(false); }
  }

  async function delivered() {
    if (!order) return;
    setBusy(true);
    try {
      const updated = await confirmOrderDelivered(order.id);
      setOrder(updated);
      setHistory(await getOrderHistory(order.id));
      broadcastOrdersChanged();
      toast.success("Delivery confirmed.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not confirm delivery."));
    } finally { setBusy(false); }
  }

  async function requestReturn() {
    if (!order || !returnReason.trim()) return;
    setBusy(true);
    try {
      const updated = await requestOrderReturn(order.id, returnReason.trim());
      setOrder(updated);
      setHistory(await getOrderHistory(order.id));
      setReturnReason("");
      broadcastOrdersChanged();
      toast.success("Return request submitted.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not request return."));
    } finally { setBusy(false); }
  }

  async function returnProduct() {
    if (!order) return;
    setBusy(true);
    try {
      const updated = await confirmReturnedItem(order.id);
      setOrder(updated);
      setHistory(await getOrderHistory(order.id));
      broadcastOrdersChanged();
      toast.success("Return confirmed. The shop will confirm receipt next.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not confirm the return."));
    } finally { setBusy(false); }
  }

  async function confirmRefund() {
    if (!order) return;
    setBusy(true);
    try {
      const updated = await confirmRefundReceived(order.id);
      setOrder(updated);
      setHistory(await getOrderHistory(order.id));
      broadcastOrdersChanged();
      toast.success("Refund received. Return process completed.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not confirm the refund."));
    } finally { setBusy(false); }
  }

  async function saveReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedItem || !user) return;

    setReviewSaving(true);
    try {
      const saved = ownReview
        ? await updateReview(ownReview.id, stars, comment.trim())
        : await createReview(selectedItem.productId, stars, comment.trim());

      setReviewsByProduct((current) => {
        const productReviews = current[selectedItem.productId] ?? [];
        return {
          ...current,
          [selectedItem.productId]: ownReview
            ? productReviews.map((review) => (review.id === saved.id ? saved : review))
            : [saved, ...productReviews],
        };
      });
      toast.success(ownReview ? "Review updated." : "Review published.");
      navigate(`/products/${selectedItem.productId}#reviews`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not save your review."));
    } finally {
      setReviewSaving(false);
    }
  }

  async function removeReview() {
    if (!ownReview || !selectedItem) return;

    setReviewSaving(true);
    try {
      await deleteReview(ownReview.id);
      setReviewsByProduct((current) => ({
        ...current,
        [selectedItem.productId]: (current[selectedItem.productId] ?? []).filter((review) => review.id !== ownReview.id),
      }));
      setStars(5);
      setComment("");
      toast.success("Review deleted.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not delete your review."));
    } finally {
      setReviewSaving(false);
    }
  }

  if (loading) return <main className="page-shell"><Loading label="Loading order" /></main>;
  if (!order) return <main className="page-shell"><EmptyState title="Order not found" description="This order is unavailable or does not belong to this account." action={<Link className="button button-primary" to="/orders">Back to orders</Link>} /></main>;

  const itemSubtotal = order.items.reduce((sum, item) => sum + item.subtotal, 0);
  const canReturn = order.status === "DELIVERED" || order.status === "RETURN_REJECTED";
  const canConfirmReturned = order.status === "RETURN_APPROVED";
  const canConfirmRefund = order.status === "REFUNDED";
  const canReview = !isAdmin && REVIEWABLE_STATUSES.has(order.status) && order.items.length > 0;

  return (
    <main className="page-shell order-detail-page">
      <nav className="breadcrumbs"><Link to={isAdmin ? "/admin" : "/orders"}>Orders</Link><span>/</span><span>#{order.id}</span></nav>
      <header className="page-heading compact-heading">
        <div><p className="section-kicker">Order #{order.id}</p><h1>{label(order.status)}</h1></div>
        <p>Placed {formatDate(order.createdAt)} · {order.totalItems} item{order.totalItems === 1 ? "" : "s"}</p>
      </header>

      <div className="order-detail-grid">
        <section className="admin-table-card">
          <div className="admin-card-head"><h2>Order items</h2><span>{formatCurrency(order.totalAmount)}</span></div>
          <div className="order-lines">
            {order.items.map((item) => <div className="order-line" key={item.productId}><div><Link to={`/products/${item.productId}`}>{item.productName}</Link><span>{item.quantity} × {formatCurrency(item.priceAtPurchase)}</span></div><strong>{formatCurrency(item.subtotal)}</strong></div>)}
          </div>
          <div className="account-card-body order-totals">
            <div><span>Items</span><strong>{formatCurrency(itemSubtotal)}</strong></div>
            {order.discountAmount > 0 && <div><span>Discount {order.couponCode ? `(${order.couponCode})` : ""}</span><strong>-{formatCurrency(order.discountAmount)}</strong></div>}
            <div><span>Shipping · {order.shippingMethod}</span><strong>{order.shippingFee === 0 ? "Free" : formatCurrency(order.shippingFee)}</strong></div>
            <div className="summary-total"><span>Total</span><strong>{formatCurrency(order.totalAmount)}</strong></div>
          </div>
        </section>

        <aside className="admin-table-card">
          <div className="admin-card-head"><h2>Delivery</h2><span>{order.carrier ?? order.shippingMethod}</span></div>
          <div className="account-card-body">
            <strong>{order.receiverName ?? "Delivery address"}</strong>
            <p>{order.shippingAddress ?? "No address snapshot was stored for this legacy order."}</p>
            {order.receiverPhone && <small>{order.receiverPhone}</small>}
            {order.trackingNumber && <div className="inline-notice"><strong>Tracking</strong><br />{order.trackingNumber}</div>}
            {!isAdmin && order.status === "PENDING" && !order.vnpayTransId && !order.returnReason && <button className="button button-primary button-full" disabled={busy} onClick={() => void pay()}>Pay with VNPay</button>}
            {!isAdmin && order.status === "PENDING" && (order.vnpayTransId || order.returnReason) && <div className="inline-notice">Payment is closed for this order.</div>}
            {!isAdmin && order.status === "SHIPPED" && <button className="button button-primary button-full" disabled={busy} onClick={() => setConfirmKind("delivered")}>Delivered</button>}
          </div>
        </aside>
      </div>

      <section className="admin-table-card order-timeline-card">
        <div className="admin-card-head"><h2>Order timeline</h2><span>{history.length} events</span></div>
        <div className="timeline-list">
          {history.length === 0 && <div className="inline-notice">Timeline is available for orders created after the latest database migration.</div>}
          {history.map((event) => (
            <article className="timeline-item" key={event.id}>
              <span className="timeline-dot" />
              <div><strong>{label(event.toStatus)}</strong><p>{event.note || "Order status updated."}</p><small>{event.changedByName || "System"} · {formatDate(event.createdAt)}</small></div>
            </article>
          ))}
        </div>
      </section>

      {!isAdmin && (canReturn || canReview || Boolean(order.returnReason)) && (
        <div className="order-aftercare-grid">
          <section className="admin-table-card return-card">
            <div className="admin-card-head">
              <h2>{canReturn ? "Return this order" : "Return request"}</h2>
              <span>{canReturn ? "After delivery" : label(order.status)}</span>
            </div>
            <div className="account-card-body">
              {canReturn ? (
                <>
                  {order.returnReason && (
                    <div className="inline-notice return-history-note">
                      <strong>Previous return request</strong><br />
                      {order.returnReason} · {label(order.status)}
                    </div>
                  )}
                  <label className="form-field"><span>Reason</span><textarea rows={4} value={returnReason} onChange={(event) => setReturnReason(event.target.value)} placeholder="Wrong item, damaged product, defect, or another reason" /></label>
                  <button className="button button-primary" disabled={busy || !returnReason.trim()} onClick={() => void requestReturn()}>Request return</button>
                </>
              ) : order.returnReason ? (
                <div className="return-status-summary">
                  <p><strong>Reason</strong></p>
                  <p>{order.returnReason}</p>
                  <div className="inline-notice"><strong>Status</strong><br />{label(order.status)}</div>

                  {canConfirmReturned && (
                    <>
                      <p>Your return was approved. After you send the product back to the shop, confirm it here.</p>
                      <button className="button button-primary" disabled={busy} onClick={() => void returnProduct()}>Return product</button>
                    </>
                  )}

                  {order.status === "RETURNED" && (
                    <p>Item marked as returned. Waiting for the admin to confirm that the shop received it.</p>
                  )}

                  {order.status === "RETURN_RECEIVED" && (
                    <p>The shop received your returned item. Waiting for the admin to send the refund.</p>
                  )}

                  {canConfirmRefund && (
                    <>
                      <p>The admin marked the refund as sent. Confirm only after the money reaches you.</p>
                      <button className="button button-primary" disabled={busy} onClick={() => void confirmRefund()}>Confirm refund received</button>
                    </>
                  )}

                  {order.status === "REFUND_CONFIRMED" && (
                    <div className="inline-notice"><strong>Completed</strong><br />You confirmed that the refund was received.</div>
                  )}
                </div>
              ) : (
                <div className="inline-notice">No return request has been submitted for this order.</div>
              )}
            </div>
          </section>

          {canReview && selectedItem && (
            <section className="admin-table-card order-review-card">
              <div className="admin-card-head"><h2>Review products</h2><span>Verified purchase</span></div>
              <form className="account-card-body order-review-form" onSubmit={saveReview}>
                {order.items.length > 1 ? (
                  <label className="form-field">
                    <span>Product</span>
                    <select value={selectedItem.productId} onChange={(event) => setSelectedReviewProductId(Number(event.target.value))}>
                      {order.items.map((item) => <option key={item.productId} value={item.productId}>{item.productName}</option>)}
                    </select>
                  </label>
                ) : (
                  <div className="inline-notice"><strong>{selectedItem.productName}</strong><br />Purchased in order #{order.id}</div>
                )}
                <label className="form-field"><span>Rating</span><select value={stars} onChange={(event) => setStars(Number(event.target.value))}>{[5,4,3,2,1].map((value) => <option key={value} value={value}>{value} star{value === 1 ? "" : "s"}</option>)}</select></label>
                <label className="form-field"><span>Comment</span><textarea rows={4} maxLength={2000} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="What should another customer know?" /></label>
                <div className="order-review-actions">
                  <button className="button button-primary" disabled={reviewSaving}>{reviewSaving ? "Saving…" : ownReview ? "Update review" : "Publish review"}</button>
                  {ownReview && <button className="text-button danger-text" type="button" disabled={reviewSaving} onClick={() => setConfirmKind("deleteReview")}>Delete my review</button>}
                </div>
              </form>
            </section>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmKind !== null}
        title={confirmKind === "delivered" ? "Confirm delivery" : "Delete your review?"}
        message={confirmKind === "delivered"
          ? "Confirm that you have received this order. The order will move to Delivered."
          : "Your review will be permanently removed from this product."}
        confirmLabel={confirmKind === "delivered" ? "Yes, I received it" : "Delete review"}
        danger={confirmKind === "deleteReview"}
        busy={busy || reviewSaving}
        onCancel={() => setConfirmKind(null)}
        onConfirm={() => {
          const kind = confirmKind;
          setConfirmKind(null);
          if (kind === "delivered") void delivered();
          if (kind === "deleteReview") void removeReview();
        }}
      />
    </main>
  );
}
