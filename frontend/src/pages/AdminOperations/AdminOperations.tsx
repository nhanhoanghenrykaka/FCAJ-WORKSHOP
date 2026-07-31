import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  adjustInventory,
  closeSupportTicket,
  createCoupon,
  deleteCoupon,
  getAdminDashboard,
  getAllOrders,
  getAllProducts,
  getAuditLogs,
  getCoupons,
  getCustomers,
  getInventoryTransactions,
  getSupportTickets,
  processOrderReturn,
  replySupportTicket,
  setCustomerBanned,
  shipOrder,
} from "../../api/storeApi";
import { getApiErrorMessage } from "../../api/client";
import { Loading } from "../../components/common/Loading";
import { Pagination } from "../../components/common/Pagination";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { usePagination } from "../../hooks/usePagination";
import type { AdminDashboard, AuditLog, Coupon, CustomerSummary, InventoryTransaction, Order, Product, SupportTicket } from "../../types";
import { formatCurrency, formatDate } from "../../utils/format";
import { broadcastOrdersChanged } from "../../utils/orderSync";

type Tab = "dashboard" | "customers" | "inventory" | "promotions" | "returns" | "support" | "audit";
const tabs: Tab[] = ["dashboard", "customers", "inventory", "promotions", "returns", "support", "audit"];

export default function AdminOperations() {
  const initial = window.location.hash.replace("#", "") as Tab;
  const [tab, setTab] = useState<Tab>(tabs.includes(initial) ? initial : "dashboard");
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [inventory, setInventory] = useState<InventoryTransaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [inventoryCategory, setInventoryCategory] = useState("");
  const [inventoryProduct, setInventoryProduct] = useState("");
  const [inventoryChange, setInventoryChange] = useState("");
  const [inventoryNote, setInventoryNote] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponType, setCouponType] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [couponValue, setCouponValue] = useState("");
  const [couponMinimum, setCouponMinimum] = useState("0");
  const [couponPerCustomerLimit, setCouponPerCustomerLimit] = useState("1");
  const [couponAudience, setCouponAudience] = useState<"ALL" | "SELECTED">("SELECTED");
  const [couponCustomerIds, setCouponCustomerIds] = useState<number[]>([]);
  const [supportDrafts, setSupportDrafts] = useState<Record<number, string>>({});
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [stockAttentionFilter, setStockAttentionFilter] = useState<"LOW" | "OUT" | null>(null);
  const [banTarget, setBanTarget] = useState<CustomerSummary | null>(null);
  const [banReason, setBanReason] = useState("Vi phạm quy định của Shopsflow");
  const [banBusy, setBanBusy] = useState(false);

  async function load() {
    const results = await Promise.allSettled([
      getAdminDashboard(), getCustomers(), getInventoryTransactions(), getAllProducts({ sort: "createdAt,desc" }),
      getCoupons(), getAllOrders(), getSupportTickets(true), getAuditLogs(),
    ]);
    if (results[0].status === "fulfilled") setDashboard(results[0].value);
    if (results[1].status === "fulfilled") setCustomers(results[1].value);
    if (results[2].status === "fulfilled") setInventory(results[2].value);
    if (results[3].status === "fulfilled") setProducts(results[3].value);
    if (results[4].status === "fulfilled") setCoupons(results[4].value);
    if (results[5].status === "fulfilled") setOrders(results[5].value);
    if (results[6].status === "fulfilled") setTickets(results[6].value);
    if (results[7].status === "fulfilled") setAudit(results[7].value);
    if (results.some((result) => result.status === "rejected")) toast.warning("Some admin operations data could not be loaded.");
    setLoading(false);
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => document.visibilityState === "visible" && void load(), 5000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => { window.history.replaceState(null, "", `${window.location.pathname}#${tab}`); }, [tab]);

  const returnOrders = useMemo(() => orders.filter((order) => [
    "RETURN_REQUESTED", "RETURN_APPROVED", "RETURN_REJECTED", "RETURNED",
    "RETURN_RECEIVED", "REFUNDED", "REFUND_CONFIRMED",
  ].includes(order.status)), [orders]);
  const selectedTicket = useMemo(() => tickets.find((ticket) => ticket.id === selectedTicketId) ?? null, [selectedTicketId, tickets]);
  const returnActionCount = useMemo(() => returnOrders.filter((order) => [
    "RETURN_REQUESTED", "RETURN_APPROVED", "RETURNED", "RETURN_RECEIVED", "REFUNDED",
  ].includes(order.status)).length, [returnOrders]);


  const inventoryCategories = useMemo(() => {
    const byId = new Map<number, { id: string; name: string }>();
    products.forEach((product) => product.categories.forEach((category) => byId.set(category.id, { id: String(category.id), name: category.name })));
    const result = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
    if (products.some((product) => product.categories.length === 0)) result.push({ id: "UNCATEGORIZED", name: "Uncategorized" });
    return result;
  }, [products]);

  const inventoryProductsForCategory = useMemo(() => {
    if (!inventoryCategory) return [];
    if (inventoryCategory === "UNCATEGORIZED") return products.filter((product) => product.categories.length === 0);
    const categoryId = Number(inventoryCategory);
    return products.filter((product) => product.categories.some((category) => category.id === categoryId));
  }, [inventoryCategory, products]);

  const attentionProducts = useMemo(() => {
    if (stockAttentionFilter === "OUT") return products.filter((product) => product.stockQuantity === 0);
    if (stockAttentionFilter === "LOW") return products.filter((product) => product.stockQuantity > 0 && product.stockQuantity <= 5);
    return [];
  }, [products, stockAttentionFilter]);

  const customerPager = usePagination(customers, 10);
  const inventoryPager = usePagination(inventory, 12);
  const couponPager = usePagination(coupons, 10);
  const returnPager = usePagination(returnOrders, 10);
  const supportPager = usePagination(tickets, 10);
  const auditPager = usePagination(audit, 12);

  async function doInventory(event: React.FormEvent) {
    event.preventDefault();
    const productId = Number(inventoryProduct);
    const change = Number(inventoryChange);
    if (!productId || !Number.isInteger(change) || change === 0) return;
    try {
      const tx = await adjustInventory(productId, change, inventoryNote.trim());
      setInventory((current) => [tx, ...current]);
      setProducts(await getAllProducts({ sort: "createdAt,desc" }));
      setInventoryChange(""); setInventoryNote("");
      toast.success("Inventory adjusted.");
    } catch (error) { toast.error(getApiErrorMessage(error, "Could not adjust inventory.")); }
  }

  function toggleCouponCustomer(id: number) {
    setCouponCustomerIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  async function doCoupon(event: React.FormEvent) {
    event.preventDefault();
    if (couponAudience === "SELECTED" && couponCustomerIds.length === 0) return toast.error("Choose at least one customer.");
    try {
      const created = await createCoupon({
        code: couponCode.trim(), discountType: couponType, discountValue: Number(couponValue),
        minimumOrder: Number(couponMinimum || 0), active: true, startsAt: null, endsAt: null, usageLimit: null,
        perCustomerUsageLimit: Number(couponPerCustomerLimit || 1),
        audienceAll: couponAudience === "ALL", customerIds: couponAudience === "ALL" ? [] : couponCustomerIds,
      });
      setCoupons((current) => [created, ...current]);
      setCouponCode(""); setCouponValue(""); setCouponMinimum("0"); setCouponPerCustomerLimit("1"); setCouponCustomerIds([]);
      toast.success(couponAudience === "ALL" ? "Promotion created for all customers." : "Promotion created for selected customers.");
    } catch (error) { toast.error(getApiErrorMessage(error, "Could not create promotion.")); }
  }

  async function toggleBan(customer: CustomerSummary) {
    if (!customer.banned) {
      setBanTarget(customer);
      setBanReason("Vi phạm quy định của Shopsflow");
      return;
    }
    try {
      const updated = await setCustomerBanned(customer.id, false);
      setCustomers((current) => current.map((item) => item.id === customer.id ? { ...item, banned: Boolean(updated.banned), bannedReason: null } : item));
      toast.success("Customer access restored.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not update customer access."));
    }
  }

  async function confirmBan() {
    if (!banTarget || !banReason.trim()) return;
    try {
      setBanBusy(true);
      const updated = await setCustomerBanned(banTarget.id, true, banReason.trim());
      setCustomers((current) => current.map((item) => item.id === banTarget.id ? { ...item, banned: Boolean(updated.banned), bannedReason: banReason.trim() } : item));
      toast.success("Customer banned.");
      setBanTarget(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not update customer access."));
    } finally {
      setBanBusy(false);
    }
  }

  async function handleReturn(orderId: number, status: Order["status"]) {
    try {
      const updated = await processOrderReturn(orderId, status);
      setOrders((current) => current.map((item) => item.id === orderId ? updated : item));
      broadcastOrdersChanged();
      toast.success(`Order #${orderId} updated to ${status}.`);
    } catch (error) { toast.error(getApiErrorMessage(error, "Could not update return.")); }
  }

  async function quickShip(order: Order) {
    try {
      const updated = await shipOrder(order.id);
      setOrders((current) => current.map((item) => item.id === order.id ? updated : item));
      broadcastOrdersChanged();
      toast.success(`Order #${order.id} marked as shipped.`);
    } catch (error) { toast.error(getApiErrorMessage(error, "Could not ship order.")); }
  }

  async function reply(ticketId: number) {
    const body = supportDrafts[ticketId]?.trim();
    if (!body) return;
    try {
      const updated = await replySupportTicket(ticketId, body);
      setTickets((current) => current.map((item) => item.id === ticketId ? updated : item));
      setSupportDrafts((current) => ({ ...current, [ticketId]: "" }));
    } catch (error) { toast.error(getApiErrorMessage(error, "Could not reply.")); }
  }

  if (loading) return <main className="page-shell"><Loading label="Loading admin operations" /></main>;

  return (
    <main className="page-shell admin-operations-page">
      <header className="page-heading compact-heading"><div><p className="section-kicker">Operations</p><h1>Run the business.</h1></div><p>Customers, stock, promotions, returns, support and audit trail.</p></header>
      <div className="admin-tabs">{tabs.map((item) => <button className={tab === item ? "is-active" : ""} key={item} onClick={() => setTab(item)}>{item}{item === "returns" && returnActionCount > 0 && <span className="admin-tab-count needs-action">{returnActionCount}</span>}</button>)}</div>

      {tab === "dashboard" && dashboard && <>
        <section className="admin-stats"><div><span>Revenue</span><strong>{formatCurrency(dashboard.revenue)}</strong></div><div><span>Orders</span><strong>{dashboard.totalOrders}</strong></div><div><span>Customers</span><strong>{dashboard.totalCustomers}</strong></div><div><span>Avg rating</span><strong>{dashboard.averageRating.toFixed(1)}</strong></div></section>
        <div className="admin-split operations-panels"><section className="admin-table-card"><div className="admin-card-head"><h2>Top products</h2><span>Units sold</span></div><div className="category-list">{dashboard.topProducts.map((item) => <div key={item.productId}><span><strong>{item.productName}</strong><small>{formatCurrency(item.revenue)}</small></span><strong>{item.unitsSold}</strong></div>)}</div></section><section className="admin-table-card"><div className="admin-card-head"><h2>Stock attention</h2><span>Live</span></div><div className="account-card-body stock-attention-body"><button type="button" className={`stock-attention-row ${stockAttentionFilter === "LOW" ? "is-active" : ""}`} onClick={() => setStockAttentionFilter((current) => current === "LOW" ? null : "LOW")}><span><strong>{dashboard.lowStockProducts}</strong> low-stock products</span><span>View →</span></button><button type="button" className={`stock-attention-row ${stockAttentionFilter === "OUT" ? "is-active" : ""}`} onClick={() => setStockAttentionFilter((current) => current === "OUT" ? null : "OUT")}><span><strong>{dashboard.outOfStockProducts}</strong> out-of-stock products</span><span>View →</span></button><p><strong>{dashboard.totalProducts}</strong> products total</p>{stockAttentionFilter && <div className="stock-attention-list">{attentionProducts.length === 0 ? <span className="muted-copy">No products in this group.</span> : attentionProducts.map((product) => <button type="button" key={product.id} onClick={() => { const firstCategory = product.categories[0]; setInventoryCategory(firstCategory ? String(firstCategory.id) : "UNCATEGORIZED"); setInventoryProduct(String(product.id)); setTab("inventory"); }}><span><strong>{product.name}</strong><small>{product.categories.map((category) => category.name).join(" · ") || "Uncategorized"}</small></span><strong>{product.stockQuantity} left</strong></button>)}</div>}</div></section></div>
      </>}

      {tab === "customers" && <section className="admin-table-card"><div className="admin-card-head"><h2>Customers</h2><span>{customers.length}</span></div><div className="table-scroll"><table><thead><tr><th>Customer</th><th>Gmail</th><th>Phone</th><th>Orders</th><th>Spent</th><th>Status</th><th>Action</th></tr></thead><tbody>{customerPager.pageItems.map((customer) => <tr key={customer.id}><td><div className="customer-cell">{customer.profileImageUrl ? <img className="table-avatar" src={customer.profileImageUrl} alt="" /> : null}<span><strong>{customer.name}</strong></span></div></td><td>{customer.email}</td><td>{customer.phone || "—"}</td><td>{customer.orderCount}</td><td>{formatCurrency(customer.totalSpent)}</td><td>{customer.banned ? <span className="status-pill status-cancelled">BANNED</span> : <span className="status-pill status-paid">ACTIVE</span>}{customer.bannedReason && <small>{customer.bannedReason}</small>}</td><td><button className={customer.banned ? "text-button" : "danger-text"} onClick={() => void toggleBan(customer)}>{customer.banned ? "Unban" : "Ban"}</button></td></tr>)}</tbody></table></div><Pagination page={customerPager.page} totalPages={customerPager.totalPages} onPageChange={customerPager.setPage} /></section>}

      {tab === "inventory" && <div className="admin-split"><form className="admin-table-card account-card" onSubmit={doInventory}><div className="admin-card-head"><h2>Stock adjustment</h2><span>Manual</span></div><div className="account-card-body"><label className="form-field"><span>Category</span><select value={inventoryCategory} onChange={(e) => { setInventoryCategory(e.target.value); setInventoryProduct(""); }} required><option value="">Choose category</option>{inventoryCategories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label><label className="form-field"><span>Product</span><select value={inventoryProduct} onChange={(e) => setInventoryProduct(e.target.value)} disabled={!inventoryCategory} required><option value="">{inventoryCategory ? "Choose product" : "Choose category first"}</option>{inventoryProductsForCategory.map((product) => <option value={product.id} key={product.id}>{product.name} · stock {product.stockQuantity}</option>)}</select></label><label className="form-field"><span>Quantity change</span><input type="number" value={inventoryChange} onChange={(e) => setInventoryChange(e.target.value)} placeholder="+10 or -2" required /></label><label className="form-field"><span>Note</span><input value={inventoryNote} onChange={(e) => setInventoryNote(e.target.value)} /></label><button className="button button-primary">Apply adjustment</button></div></form><section className="admin-table-card"><div className="admin-card-head"><h2>Inventory history</h2><span>{inventory.length}</span></div><div className="table-scroll"><table><thead><tr><th>Product</th><th>Change</th><th>Type</th><th>Actor</th><th>When</th></tr></thead><tbody>{inventoryPager.pageItems.map((item) => <tr key={item.id}><td><strong>{item.productName}</strong><small>{item.note || `#${item.productId}`}</small></td><td className={item.quantityChange < 0 ? "danger-text" : ""}>{item.quantityChange > 0 ? "+" : ""}{item.quantityChange}</td><td>{item.type}</td><td>{item.actorName || "System"}</td><td>{formatDate(item.createdAt)}</td></tr>)}</tbody></table></div><Pagination page={inventoryPager.page} totalPages={inventoryPager.totalPages} onPageChange={inventoryPager.setPage} /></section></div>}

      {tab === "promotions" && <div className="admin-split">
        <form className="admin-table-card account-card" onSubmit={doCoupon}><div className="admin-card-head"><h2>Create promotion</h2><span>Coupon</span></div><div className="account-card-body">
          <label className="form-field"><span>Code</span><input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="SUMMER20" required /></label>
          <div className="form-grid-two"><label className="form-field"><span>Type</span><select value={couponType} onChange={(e) => setCouponType(e.target.value as "PERCENT" | "FIXED")}><option value="PERCENT">Percent</option><option value="FIXED">Fixed</option></select></label><label className="form-field"><span>Value</span><input type="number" min="0.01" step="0.01" value={couponValue} onChange={(e) => setCouponValue(e.target.value)} required /></label></div>
          <label className="form-field"><span>Minimum order</span><input type="number" min="0" step="0.01" value={couponMinimum} onChange={(e) => setCouponMinimum(e.target.value)} /></label>
          <label className="form-field"><span>Uses per customer</span><input type="number" min="1" step="1" value={couponPerCustomerLimit} onChange={(e) => setCouponPerCustomerLimit(e.target.value)} required /><small>How many orders each eligible customer can use this coupon on.</small></label>
          <label className="form-field"><span>Who receives this coupon?</span><select value={couponAudience} onChange={(e) => setCouponAudience(e.target.value as "ALL" | "SELECTED")}><option value="SELECTED">Selected customers</option><option value="ALL">All customers</option></select></label>
          {couponAudience === "SELECTED" && <div className="recipient-picker">{customers.map((customer) => <label key={customer.id}><input type="checkbox" checked={couponCustomerIds.includes(customer.id)} onChange={() => toggleCouponCustomer(customer.id)} /> <span>{customer.name}<small>{customer.email}</small></span></label>)}</div>}
          <button className="button button-primary">Create promotion</button>
        </div></form>
        <section className="admin-table-card"><div className="admin-card-head"><h2>Promotions</h2><span>{coupons.length}</span></div><div className="category-list">{couponPager.pageItems.map((coupon) => <div key={coupon.id}><span><strong>{coupon.code}</strong><small>{coupon.discountType === "PERCENT" ? `${coupon.discountValue}%` : formatCurrency(coupon.discountValue)} · min {formatCurrency(coupon.minimumOrder)} · {coupon.perCustomerUsageLimit ?? 1} use(s)/customer · {coupon.audienceAll ? "all customers" : `${coupon.customerIds.length} selected customer(s)`}</small></span><button className="danger-text" onClick={() => void deleteCoupon(coupon.id).then(() => setCoupons((current) => current.filter((item) => item.id !== coupon.id)))}>Delete</button></div>)}</div><Pagination page={couponPager.page} totalPages={couponPager.totalPages} onPageChange={couponPager.setPage} /></section>
      </div>}

      {tab === "returns" && <section className="admin-table-card"><div className="admin-card-head"><h2>Returns</h2><span>{returnOrders.length}</span></div><div className="table-scroll"><table><thead><tr><th>Order</th><th>Customer</th><th>Gmail</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead><tbody>{returnPager.pageItems.map((order) => <tr key={order.id}><td><Link to={`/admin/orders/${order.id}`}>#{order.id}</Link></td><td><strong>{order.userName}</strong></td><td>{order.userEmail || "—"}</td><td>{order.returnReason || "—"}</td><td>{order.status}</td><td><div className="row-actions">{order.status === "RETURN_REQUESTED" && <><button className="return-action return-action-approve" onClick={() => void handleReturn(order.id, "RETURN_APPROVED")}>Approve</button><button className="return-action return-action-reject" onClick={() => void handleReturn(order.id, "RETURN_REJECTED")}>Reject</button></>}{order.status === "RETURN_APPROVED" && <span className="return-action-waiting">Waiting for customer return</span>}{order.status === "RETURNED" && <button className="return-action return-action-receive" onClick={() => void handleReturn(order.id, "RETURN_RECEIVED")}>Confirm received</button>}{order.status === "RETURN_RECEIVED" && <button className="return-action return-action-refund" onClick={() => void handleReturn(order.id, "REFUNDED")}>Refund</button>}{order.status === "REFUNDED" && <span className="return-action-waiting">Waiting for customer refund confirmation</span>}{order.status === "REFUND_CONFIRMED" && <span className="return-action-waiting return-action-complete">Completed</span>}{order.status === "RETURN_REJECTED" && <span className="return-action-waiting return-action-rejected">Rejected</span>}</div></td></tr>)}</tbody></table></div><Pagination page={returnPager.page} totalPages={returnPager.totalPages} onPageChange={returnPager.setPage} /></section>}

      {tab === "support" && <div className="support-admin-workspace"><section className="admin-table-card"><div className="admin-card-head"><h2>Support tickets</h2><span>{tickets.length}</span></div><div className="table-scroll"><table><thead><tr><th>Ticket</th><th>Customer</th><th>Gmail</th><th>Product</th><th>Category</th><th>Status</th><th>Updated</th><th></th></tr></thead><tbody>{supportPager.pageItems.map((ticket) => <tr key={ticket.id} className={selectedTicketId === ticket.id ? "selected-row" : ""}><td><strong>#{ticket.id} · {ticket.subject}</strong></td><td><strong>{ticket.userName}</strong></td><td>{ticket.userEmail || "—"}</td><td>{ticket.productName || "Legacy ticket"}</td><td>{ticket.categoryName || "—"}</td><td>{ticket.status}</td><td>{formatDate(ticket.updatedAt)}</td><td><button className="text-button" onClick={() => setSelectedTicketId(ticket.id)}>View chat</button></td></tr>)}</tbody></table></div><Pagination page={supportPager.page} totalPages={supportPager.totalPages} onPageChange={supportPager.setPage} /></section>
        {selectedTicket && <article className="admin-table-card support-ticket support-detail"><div className="admin-card-head"><div><h2>#{selectedTicket.id} · {selectedTicket.subject}</h2><small>{selectedTicket.userName} · {selectedTicket.userEmail} · {selectedTicket.productName || "Product"} · {selectedTicket.categoryName || "Category"}</small></div><button className="text-button" onClick={() => setSelectedTicketId(null)}>Close detail</button></div><div className="support-messages">{selectedTicket.messages.map((message) => <div className={`support-message ${message.senderRole === "ADMIN" ? "is-admin" : "is-customer"}`} key={message.id}><strong>{message.senderName}</strong><p>{message.message}</p><small>{formatDate(message.createdAt)}</small></div>)}</div>{selectedTicket.status !== "CLOSED" && <div className="support-reply"><textarea rows={3} value={supportDrafts[selectedTicket.id] ?? ""} onChange={(e) => setSupportDrafts((current) => ({ ...current, [selectedTicket.id]: e.target.value }))} placeholder="Reply to customer" /><div className="row-actions"><button className="button button-primary" onClick={() => void reply(selectedTicket.id)}>Reply</button><button className="text-button" onClick={() => void closeSupportTicket(selectedTicket.id).then((updated) => setTickets((current) => current.map((item) => item.id === selectedTicket.id ? updated : item)))}>Close ticket</button></div></div>}</article>}
      </div>}

      {tab === "audit" && <section className="admin-table-card"><div className="admin-card-head"><div><h2>Audit log</h2><small>Traceability history: who changed what, on which record, and when. It is separate from user notifications.</small></div><span>{audit.length}</span></div><div className="table-scroll"><table><thead><tr><th>Actor</th><th>Action</th><th>Entity</th><th>Details</th><th>When</th></tr></thead><tbody>{auditPager.pageItems.map((item) => <tr key={item.id}><td><strong>{item.actorName}</strong><small>{item.actorRole || "SYSTEM"}</small></td><td>{item.action}</td><td>{item.entityType || "—"}{item.entityId ? ` #${item.entityId}` : ""}</td><td>{item.details || "—"}</td><td>{formatDate(item.createdAt)}</td></tr>)}</tbody></table></div><Pagination page={auditPager.page} totalPages={auditPager.totalPages} onPageChange={auditPager.setPage} /></section>}

      <div className="admin-operations-footer"><Link className="text-link" to="/admin">← Back to catalog/order workspace</Link>{orders.some((order) => order.status === "PAID") && <button className="text-button" onClick={() => { const next = orders.find((order) => order.status === "PAID"); if (next) void quickShip(next); }}>Quick ship next paid order</button>}</div>

      <ConfirmDialog
        open={banTarget !== null}
        title="Ban customer?"
        message={banTarget ? <>This will block <strong>{banTarget.name}</strong> ({banTarget.email}) from signing in until an admin restores access.</> : undefined}
        confirmLabel="Ban customer"
        danger
        busy={banBusy}
        inputLabel="Ban reason"
        inputValue={banReason}
        inputPlaceholder="Explain why this account is being banned"
        onInputChange={setBanReason}
        onCancel={() => { if (!banBusy) setBanTarget(null); }}
        onConfirm={() => void confirmBan()}
      />
    </main>
  );
}
