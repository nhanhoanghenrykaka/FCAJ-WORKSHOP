import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { confirmOrderDelivered, confirmRefundReceived, confirmReturnedItem, getOrders, getVNPayCheckoutUrl } from "../../api/storeApi";
import { getApiErrorMessage } from "../../api/client";
import { EmptyState } from "../../components/common/EmptyState";
import { Loading } from "../../components/common/Loading";
import { Pagination } from "../../components/common/Pagination";
import { usePagination } from "../../hooks/usePagination";
import type { Order } from "../../types";
import { formatCurrency, formatDate } from "../../utils/format";
import { broadcastOrdersChanged, subscribeToOrderChanges } from "../../utils/orderSync";

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payingOrderId, setPayingOrderId] = useState<number | null>(null);
  const [deliveringOrderId, setDeliveringOrderId] = useState<number | null>(null);
  const [returningOrderId, setReturningOrderId] = useState<number | null>(null);
  const [confirmingRefundOrderId, setConfirmingRefundOrderId] = useState<number | null>(null);
  const orderPager = usePagination(orders, 8);

  useEffect(() => {
    let disposed = false;
    let requestInFlight = false;

    async function refreshOrders(initialLoad = false) {
      if (requestInFlight) return;
      requestInFlight = true;

      try {
        const data = await getOrders();
        if (disposed) return;
        setOrders([...data].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)));
        setError("");
      } catch {
        if (!disposed && initialLoad) setError("Could not load your order history.");
      } finally {
        requestInFlight = false;
        if (!disposed && initialLoad) setLoading(false);
      }
    }

    void refreshOrders(true);

    // Keep the customer order list synchronized while the admin works in
    // another tab/browser. Same-browser changes arrive immediately through
    // BroadcastChannel; polling is the fallback for another browser/device.
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshOrders();
    }, 1500);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void refreshOrders();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    const unsubscribe = subscribeToOrderChanges(() => void refreshOrders());

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      unsubscribe();
    };
  }, []);

  async function handlePayNow(orderId: number) {
    setPayingOrderId(orderId);
    try {
      const payUrl = await getVNPayCheckoutUrl(orderId);
      if (payUrl) {
        window.location.href = payUrl;
        return;
      }
      toast.error("VNPay is not available right now.");
    } catch (paymentError) {
      console.error("VNPay payment error:", paymentError);
      toast.error(getApiErrorMessage(paymentError, "Could not start VNPay payment. Please try again."));
    } finally {
      setPayingOrderId(null);
    }
  }

  async function handleConfirmDelivered(orderId: number) {
    setDeliveringOrderId(orderId);
    try {
      const updatedOrder = await confirmOrderDelivered(orderId);
      setOrders((current) => current.map((order) => order.id === orderId ? updatedOrder : order));
      broadcastOrdersChanged(orderId);
      toast.success(`Order #${orderId} marked as delivered.`);
    } catch (deliveryError) {
      console.error("Confirm delivery error:", deliveryError);
      toast.error(getApiErrorMessage(deliveryError, "Could not confirm delivery. Please try again."));
    } finally {
      setDeliveringOrderId(null);
    }
  }


  async function handleReturnProduct(orderId: number) {
    setReturningOrderId(orderId);
    try {
      const updatedOrder = await confirmReturnedItem(orderId);
      setOrders((current) => current.map((order) => order.id === orderId ? updatedOrder : order));
      broadcastOrdersChanged(orderId);
      toast.success(`Order #${orderId}: product marked as returned.`);
    } catch (returnError) {
      console.error("Return product error:", returnError);
      toast.error(getApiErrorMessage(returnError, "Could not confirm the product return. Please try again."));
    } finally {
      setReturningOrderId(null);
    }
  }

  async function handleConfirmRefundReceived(orderId: number) {
    setConfirmingRefundOrderId(orderId);
    try {
      const updatedOrder = await confirmRefundReceived(orderId);
      setOrders((current) => current.map((order) => order.id === orderId ? updatedOrder : order));
      broadcastOrdersChanged(orderId);
      toast.success(`Order #${orderId}: refund receipt confirmed.`);
    } catch (refundError) {
      console.error("Confirm refund error:", refundError);
      toast.error(getApiErrorMessage(refundError, "Could not confirm the refund. Please try again."));
    } finally {
      setConfirmingRefundOrderId(null);
    }
  }

  if (loading) return <main className="page-shell"><Loading label="Loading orders" /></main>;
  if (error) return <main className="page-shell"><EmptyState title="Orders unavailable" description={error} /></main>;
  if (orders.length === 0) return <main className="page-shell"><EmptyState title="No orders yet" description="Once you complete checkout, your order history and status will appear here." action={<Link className="button button-primary" to="/catalog">Start shopping</Link>} /></main>;

  return (
    <main className="page-shell">
      <header className="page-heading compact-heading"><div><p className="section-kicker">Account / History</p><h1>Your orders.</h1></div><p>Track status and review every item in your previous checkouts.</p></header>
      <section className="order-list">
        {orderPager.pageItems.map((order) => (
          <article className="order-card" key={order.id}>
            <header className="order-card-head">
              <div><span>Order</span><strong><Link to={`/orders/${order.id}`}>#{order.id}</Link></strong></div>
              <div><span>Placed</span><strong>{formatDate(order.createdAt)}</strong></div>
              <div><span>Total</span><strong>{formatCurrency(order.totalAmount)}</strong></div>
              <span className={`status-pill status-${order.status.toLowerCase()}`}>{order.status}</span>
            </header>
            <div className="order-lines">
              {order.items.map((item) => (
                <div className="order-line" key={`${order.id}-${item.productId}`}>
                  <div><Link to={`/products/${item.productId}`}>{item.productName}</Link><span>{item.quantity} × {formatCurrency(item.priceAtPurchase)}</span></div>
                  <strong>{formatCurrency(item.subtotal)}</strong>
                </div>
              ))}
            </div>
            <footer className="order-card-foot">
              <span>{order.totalItems} item{order.totalItems === 1 ? "" : "s"}</span>
              <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                <span>{order.status === "PENDING"
                  ? (order.vnpayTransId || order.returnReason ? "Payment is closed for this order." : "Awaiting payment.")
                  : order.status === "PAID" ? "Payment confirmed."
                  : order.status === "SHIPPED" ? "Your order is on its way."
                  : order.status === "DELIVERED" ? "Delivered successfully."
                  : order.status === "CANCELLED" ? "This order was cancelled."
                  : order.status.replaceAll("_", " ").toLowerCase()}</span>
                {order.status === "PENDING" && !order.vnpayTransId && !order.returnReason && (
                  <button
                    className="button button-primary"
                    style={{ minHeight: "32px", padding: "6px 14px", fontSize: "11px" }}
                    disabled={payingOrderId !== null}
                    onClick={() => void handlePayNow(order.id)}
                  >
                    {payingOrderId === order.id ? "Redirecting…" : "Pay with VNPay"}
                  </button>
                )}
                {order.status === "RETURN_APPROVED" && (
                  <button
                    className="button button-primary"
                    style={{ minHeight: "32px", padding: "6px 14px", fontSize: "11px" }}
                    disabled={returningOrderId !== null}
                    onClick={() => void handleReturnProduct(order.id)}
                  >
                    {returningOrderId === order.id ? "Returning…" : "Return product"}
                  </button>
                )}
                {order.status === "REFUNDED" && (
                  <button
                    className="button button-primary"
                    style={{ minHeight: "32px", padding: "6px 14px", fontSize: "11px" }}
                    disabled={confirmingRefundOrderId !== null}
                    onClick={() => void handleConfirmRefundReceived(order.id)}
                  >
                    {confirmingRefundOrderId === order.id ? "Confirming…" : "Confirm refund received"}
                  </button>
                )}
                <Link className="text-link" to={`/orders/${order.id}`}>View details</Link>
                {order.status === "SHIPPED" && (
                  <button
                    className="button button-primary"
                    style={{ minHeight: "32px", padding: "6px 14px", fontSize: "11px" }}
                    disabled={deliveringOrderId !== null}
                    onClick={() => void handleConfirmDelivered(order.id)}
                  >
                    {deliveringOrderId === order.id ? "Confirming…" : "Delivered"}
                  </button>
                )}
              </div>
            </footer>
          </article>
        ))}
        <Pagination page={orderPager.page} totalPages={orderPager.totalPages} onPageChange={orderPager.setPage} />
      </section>
    </main>
  );
}
