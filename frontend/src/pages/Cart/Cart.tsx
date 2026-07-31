import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "../../api/client";
import {
  getAddresses,
  getAvailableCoupons,
  getVNPayCheckoutUrl,
  placeOrder,
  removeCartItem,
  updateCartItem,
  validateCoupon,
} from "../../api/storeApi";
import { EmptyState } from "../../components/common/EmptyState";
import { Loading } from "../../components/common/Loading";
import { ProductVisual } from "../../components/common/ProductVisual";
import { useCart } from "../../hooks/useCart";
import type { Address, Coupon } from "../../types";
import { formatCurrency } from "../../utils/format";

export default function Cart() {
  const { cart, isLoading, setCart } = useCart();
  const [busyItem, setBusyItem] = useState<number | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState<number | null>(null);
  const [shippingMethod, setShippingMethod] = useState<"STANDARD" | "EXPRESS">("STANDARD");
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
  const navigate = useNavigate();
  const hasLegacyItems = cart.items.some((item) => item.itemId === null);

  useEffect(() => {
    Promise.all([getAddresses(), getAvailableCoupons()]).then(([data, coupons]) => {
      setAddresses(data);
      setAvailableCoupons(coupons);
      const defaultAddress = data.find((item) => item.defaultAddress) ?? data[0];
      if (defaultAddress) setAddressId(defaultAddress.id);
    }).catch(() => undefined);
  }, []);

  const estimatedDiscount = useMemo(() => {
    if (!coupon) return 0;
    if (cart.totalPrice < coupon.minimumOrder) return 0;
    return coupon.discountType === "PERCENT"
      ? Math.min(cart.totalPrice, cart.totalPrice * coupon.discountValue / 100)
      : Math.min(cart.totalPrice, coupon.discountValue);
  }, [cart.totalPrice, coupon]);

  const estimatedShipping = shippingMethod === "EXPRESS" ? 4 : 0;
  const estimatedTotal = Math.max(0, cart.totalPrice - estimatedDiscount + estimatedShipping);

  async function changeQuantity(itemId: number | null, quantity: number) {
    if (itemId === null) return toast.error("The backend response is missing itemId for this cart item.");
    setBusyItem(itemId);
    try { setCart(await updateCartItem(itemId, quantity)); }
    catch (error) { toast.error(getApiErrorMessage(error, "Could not update the quantity.")); }
    finally { setBusyItem(null); }
  }

  async function removeItem(itemId: number | null) {
    if (itemId === null) return toast.error("The backend response is missing itemId for this cart item.");
    setBusyItem(itemId);
    try { setCart(await removeCartItem(itemId)); toast.success("Item removed from cart."); }
    catch (error) { toast.error(getApiErrorMessage(error, "Could not remove this item.")); }
    finally { setBusyItem(null); }
  }

  async function applyCoupon() {
    if (!couponCode.trim()) { setCoupon(null); return; }
    try {
      const validated = await validateCoupon(couponCode.trim());
      setCoupon(validated);
      setCouponCode(validated.code);
      toast.success(`Coupon ${validated.code} applied.`);
    } catch (error) {
      setCoupon(null);
      toast.error(getApiErrorMessage(error, "Coupon is not valid."));
    }
  }

  async function checkout() {
    if (!addressId) {
      toast.error("Add and select a delivery address before checkout.");
      navigate("/account");
      return;
    }
    setCheckingOut(true);
    try {
      const order = await placeOrder({ addressId, shippingMethod, couponCode: coupon?.code });
      setCart({ items: [], totalItems: 0, totalPrice: 0 });
      toast.success(`Order #${order.id} placed successfully.`);
      try {
        const payUrl = await getVNPayCheckoutUrl(order.id);
        if (payUrl) { window.location.href = payUrl; return; }
        toast.warning("VNPay is not available right now. You can retry from your order.");
      } catch (payError) {
        console.error("VNPay checkout error:", payError);
        toast.warning("Order placed, but payment was not completed. Retry from your order detail.");
      }
      navigate(`/orders/${order.id}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not place your order."));
    } finally { setCheckingOut(false); }
  }

  if (isLoading) return <main className="page-shell"><Loading label="Loading your cart" /></main>;
  if (cart.items.length === 0) return <main className="page-shell"><EmptyState title="Your cart is empty" description="The catalog is ready when you are." action={<Link className="button button-primary" to="/catalog">Browse catalog</Link>} /></main>;

  return (
    <main className="page-shell">
      <header className="page-heading compact-heading"><div><p className="section-kicker">Your selection</p><h1>Shopping cart.</h1></div><p>{cart.totalItems} item{cart.totalItems === 1 ? "" : "s"} ready for checkout.</p></header>
      {hasLegacyItems && <div className="compatibility-notice">Your backend cart response is missing itemId for some cart items.</div>}
      <div className="cart-layout">
        <section className="cart-items">
          {cart.items.map((item, index) => {
            const canChangeQuantity = item.itemId !== null && item.stockQuantity !== null;
            const maxQuantity = item.stockQuantity === null ? item.quantity : Math.max(item.quantity, Math.min(item.stockQuantity, 20));
            return <article className="cart-item" key={item.itemId ?? `${item.productId}-${index}`}>
              <Link className="cart-item-media" to={`/products/${item.productId}`}><ProductVisual imageUrl={item.imageUrl} name={item.productName} /></Link>
              <div className="cart-item-copy">
                <div><Link to={`/products/${item.productId}`}><h2>{item.productName}</h2></Link><span>{formatCurrency(item.unitPrice)} each</span></div>
                <label className="quantity-field"><span>Qty</span><select disabled={!canChangeQuantity || busyItem === item.itemId} value={item.quantity} onChange={(e) => void changeQuantity(item.itemId, Number(e.target.value))}>{Array.from({ length: maxQuantity }, (_, i) => i + 1).map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
                <strong>{formatCurrency(item.subtotal)}</strong>
                <button className="text-button danger-text" disabled={item.itemId === null || busyItem === item.itemId} onClick={() => void removeItem(item.itemId)} type="button">Remove</button>
              </div>
            </article>;
          })}
        </section>

        <aside className="order-summary checkout-summary">
          <p className="section-kicker">Checkout</p>
          <label className="form-field"><span>Delivery address</span><select value={addressId ?? ""} onChange={(e) => setAddressId(Number(e.target.value))}><option value="">Select address</option>{addresses.map((address) => <option value={address.id} key={address.id}>{address.receiverName} · {address.line1}, {address.province}</option>)}</select></label>
          {addresses.length === 0 && <Link className="text-link" to="/account">+ Add a delivery address</Link>}
          <label className="form-field"><span>Shipping</span><select value={shippingMethod} onChange={(e) => setShippingMethod(e.target.value as "STANDARD" | "EXPRESS")}><option value="STANDARD">Standard · 3–5 days · Free</option><option value="EXPRESS">Express · 1–2 days · $4.00</option></select></label>
          {availableCoupons.length > 0 && <label className="form-field"><span>Your available coupons</span><select value="" onChange={(e) => { const selected = availableCoupons.find((item) => item.code === e.target.value); if (selected) { setCouponCode(selected.code); setCoupon(null); } }}><option value="">Choose a coupon</option>{availableCoupons.map((item) => <option key={item.id} value={item.code}>{item.code} · {item.discountType === "PERCENT" ? `${item.discountValue}% off` : `${formatCurrency(item.discountValue)} off`} · min {formatCurrency(item.minimumOrder)}</option>)}</select></label>}
          <div className="coupon-row"><input placeholder="Coupon code" value={couponCode} onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCoupon(null); }} /><button type="button" className="button button-secondary" onClick={() => void applyCoupon()}>Apply</button></div>
          {coupon && <div className="inline-notice">{coupon.code}: {coupon.discountType === "PERCENT" ? `${coupon.discountValue}%` : formatCurrency(coupon.discountValue)} off.</div>}
          <dl>
            <div><dt>Items</dt><dd>{formatCurrency(cart.totalPrice)}</dd></div>
            {estimatedDiscount > 0 && <div><dt>Discount</dt><dd>-{formatCurrency(estimatedDiscount)}</dd></div>}
            <div><dt>Shipping</dt><dd>{estimatedShipping === 0 ? "Free" : formatCurrency(estimatedShipping)}</dd></div>
            <div className="summary-total"><dt>Total</dt><dd>{formatCurrency(estimatedTotal)}</dd></div>
          </dl>
          <button className="button button-primary button-full" disabled={checkingOut || !addressId} onClick={() => void checkout()}>{checkingOut ? "Placing order…" : "Place order & pay"}</button>
          <p className="summary-note">Payment is confirmed only by VNPay. Failed/cancelled payment can be retried on the same pending order.</p>
          <Link className="text-link" to="/catalog">← Continue shopping</Link>
        </aside>
      </div>
    </main>
  );
}
