import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { confirmVNPayReturn, getOrder } from "../../api/storeApi";
import type { Order } from "../../types";
import { formatCurrency, formatVndCurrency } from "../../utils/format";
import { Loading } from "../../components/common/Loading";
import { broadcastOrdersChanged } from "../../utils/orderSync";

type PaymentState = "processing" | "success" | "pending_server" | "failed";

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<PaymentState>("processing");
  const [order, setOrder] = useState<Order | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const pollCountRef = useRef(0);
  const pollTimerRef = useRef<number | null>(null);

  const responseCode = searchParams.get("vnp_ResponseCode");
  const orderIdStr = searchParams.get("vnp_TxnRef");
  const amountStr = searchParams.get("vnp_Amount");
  const transactionNo = searchParams.get("vnp_TransactionNo");

  const orderId = orderIdStr ? Number(orderIdStr) : null;
  const rawAmount = amountStr ? Number(amountStr) : 0;
  // VNPay returns amount multiplied by 100
  const vnpayAmount = rawAmount / 100;

  useEffect(() => {
    if (orderId === null || Number.isNaN(orderId)) {
      setStatus("failed");
      setErrorMsg("Invalid or missing order reference.");
      return;
    }

    const validOrderId: number = orderId;
    const returnedParams = Object.fromEntries(searchParams.entries());

    async function reconcileReturn() {
      try {
        // IPN is still the primary production path. This signed return-sync also
        // makes local Docker testing work because VNPay cannot call localhost IPN.
        await confirmVNPayReturn(returnedParams);
      } catch (error) {
        console.error("Could not reconcile VNPay return payload:", error);
      }

      if (responseCode === "00") {
        await verifyOrderPayment(validOrderId);
        return;
      }

      setStatus("failed");
      switch (responseCode) {
        case "24":
          setErrorMsg("Transaction cancelled by customer.");
          break;
        case "15":
          setErrorMsg("Transaction declined by issuer bank (incorrect credentials or OTP).");
          break;
        case "51":
          setErrorMsg("Insufficient funds in account.");
          break;
        case "09":
          setErrorMsg("Transaction failed: Bank account registration or internet banking not enabled.");
          break;
        default:
          setErrorMsg(`Payment process failed (VNPay Error Code: ${responseCode ?? "Unknown"}).`);
      }
    }

    void reconcileReturn();

    return () => {
      if (pollTimerRef.current !== null) {
        clearTimeout(pollTimerRef.current);
      }
    };
  }, [responseCode, orderIdStr]);

  async function verifyOrderPayment(id: number) {
    try {
      const fetchedOrder = await getOrder(id);
      setOrder(fetchedOrder);

      if (fetchedOrder.status === "PAID") {
        broadcastOrdersChanged(id);
        setStatus("success");
      } else if (fetchedOrder.status === "PENDING") {
        // Backend hasn't processed IPN yet, trigger polling
        if (pollCountRef.current < 3) {
          pollCountRef.current += 1;
          pollTimerRef.current = window.setTimeout(() => {
            void verifyOrderPayment(id);
          }, 2000);
        } else {
          // Polling exceeded, show pending warning
          setStatus("pending_server");
        }
      } else {
        // If order status is something else (e.g. CANCELLED)
        setStatus("failed");
        setErrorMsg(`Order is in state: ${fetchedOrder.status}`);
      }
    } catch (err) {
      console.error("Error verifying order:", err);
      // Fallback: If we can't reach server, but VNPay returned 00
      setStatus("pending_server");
    }
  }

  return (
    <main className="page-shell" style={{ display: "flex", justifyContent: "center", paddingBlock: "80px" }}>
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          background: "var(--bg-elevated)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-xl)",
          boxShadow: "0 12px 40px rgba(15, 15, 15, 0.05)",
          padding: "48px 40px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "28px",
        }}
      >
        {status === "processing" && (
          <div style={{ padding: "20px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
            <Loading label="Reconciling transaction with server…" />
            <p className="muted" style={{ fontSize: "14px", maxWidth: "34ch" }}>
              Please wait while we verify your payment details with our bank endpoints.
            </p>
          </div>
        )}

        {status === "success" && (
          <>
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "var(--success-bg)",
                color: "var(--success)",
                display: "grid",
                placeItems: "center",
                fontSize: "40px",
                fontWeight: "bold",
                boxShadow: "0 0 0 8px rgba(31, 107, 74, 0.05)",
              }}
            >
              ✓
            </div>

            <div>
              <p className="section-kicker" style={{ color: "var(--success)" }}>Payment Complete</p>
              <h1 className="h-3" style={{ fontSize: "32px", letterSpacing: "-0.03em" }}>Thank you!</h1>
              <p className="muted" style={{ marginTop: "8px", fontSize: "14px" }}>
                Your transaction was completed successfully and your order has been paid.
              </p>
            </div>

            <div
              style={{
                width: "100%",
                background: "rgba(255, 255, 255, 0.5)",
                border: "1px solid var(--line-2)",
                borderRadius: "var(--r-lg)",
                padding: "20px",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span className="muted">Order Reference</span>
                <strong className="mono">#{orderId}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span className="muted">VNPay ID</span>
                <strong className="mono">{transactionNo ?? "N/A"}</strong>
              </div>
              <hr style={{ borderTop: "1px dashed var(--line)" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px", fontWeight: "600" }}>
                <span>Amount Paid</span>
                <span>{order ? formatCurrency(order.totalAmount) : formatVndCurrency(vnpayAmount)}</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
              <button className="button button-primary button-full" onClick={() => navigate("/orders")}>
                View Order History
              </button>
              <button className="button button-secondary button-full" onClick={() => navigate("/catalog")}>
                Continue Shopping
              </button>
            </div>
          </>
        )}

        {status === "pending_server" && (
          <>
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "var(--warn-bg)",
                color: "var(--warn)",
                display: "grid",
                placeItems: "center",
                fontSize: "40px",
                fontWeight: "bold",
                boxShadow: "0 0 0 8px rgba(139, 90, 15, 0.05)",
              }}
            >
              !
            </div>

            <div>
              <p className="section-kicker" style={{ color: "var(--warn)" }}>Pending Confirmation</p>
              <h1 className="h-3" style={{ fontSize: "32px", letterSpacing: "-0.03em" }}>Almost there</h1>
              <p className="muted" style={{ marginTop: "8px", fontSize: "14px" }}>
                VNPay confirmed your payment, but the backend is still updating. The status should reflect shortly.
              </p>
            </div>

            <div
              style={{
                width: "100%",
                background: "rgba(255, 255, 255, 0.5)",
                border: "1px solid var(--line-2)",
                borderRadius: "var(--r-lg)",
                padding: "20px",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span className="muted">Order Reference</span>
                <strong className="mono">#{orderId}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span className="muted">VNPay ID</span>
                <strong className="mono">{transactionNo ?? "N/A"}</strong>
              </div>
              <hr style={{ borderTop: "1px dashed var(--line)" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px", fontWeight: "600" }}>
                <span>Amount Auth</span>
                <span>{order ? formatCurrency(order.totalAmount) : formatVndCurrency(vnpayAmount)}</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
              <button
                className="button button-primary button-full"
                onClick={() => {
                  setStatus("processing");
                  pollCountRef.current = 0;
                  if (orderId) verifyOrderPayment(orderId);
                }}
              >
                Sync Status Now
              </button>
              <button className="button button-secondary button-full" onClick={() => navigate("/orders")}>
                Go to Orders
              </button>
            </div>
          </>
        )}

        {status === "failed" && (
          <>
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "var(--danger-bg)",
                color: "var(--danger)",
                display: "grid",
                placeItems: "center",
                fontSize: "40px",
                fontWeight: "bold",
                boxShadow: "0 0 0 8px rgba(168, 41, 32, 0.05)",
              }}
            >
              ✕
            </div>

            <div>
              <p className="section-kicker" style={{ color: "var(--danger)" }}>Transaction Unsuccessful</p>
              <h1 className="h-3" style={{ fontSize: "32px", letterSpacing: "-0.03em" }}>Payment Failed</h1>
              <p className="muted" style={{ marginTop: "8px", fontSize: "14px" }}>
                {errorMsg ?? "The payment transaction could not be processed or was cancelled."}
              </p>
            </div>

            <div
              style={{
                width: "100%",
                background: "rgba(255, 255, 255, 0.5)",
                border: "1px solid var(--line-2)",
                borderRadius: "var(--r-lg)",
                padding: "20px",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span className="muted">Order Reference</span>
                <strong className="mono">#{orderId ?? "N/A"}</strong>
              </div>
              {transactionNo && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                  <span className="muted">VNPay ID</span>
                  <strong className="mono">{transactionNo}</strong>
                </div>
              )}
              {responseCode && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                  <span className="muted">VNPay Response Code</span>
                  <strong className="mono">{responseCode}</strong>
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
              <button className="button button-primary button-full" onClick={() => navigate("/cart")}>
                Return to Cart
              </button>
              <button className="button button-secondary button-full" onClick={() => navigate("/orders")}>
                View Orders History
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
