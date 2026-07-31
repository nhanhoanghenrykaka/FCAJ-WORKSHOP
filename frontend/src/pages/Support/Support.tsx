import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  closeSupportTicket,
  createSupportTicket,
  getAllProducts,
  getCategories,
  getSupportTickets,
  replySupportTicket,
} from "../../api/storeApi";
import { getApiErrorMessage } from "../../api/client";
import { Loading } from "../../components/common/Loading";
import { Pagination } from "../../components/common/Pagination";
import { usePagination } from "../../hooks/usePagination";
import type { Category, Product, SupportTicket } from "../../types";
import { formatDate } from "../../utils/format";

export default function Support() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryId, setCategoryId] = useState("");
  const [productId, setProductId] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [openTicketId, setOpenTicketId] = useState<number | null>(null);

  const filteredProducts = useMemo(() => {
    const selected = Number(categoryId);
    if (!selected) return [];
    return products.filter((product) => product.categories.some((category) => category.id === selected));
  }, [categoryId, products]);
  const ticketPager = usePagination(tickets, 6);

  useEffect(() => {
    let disposed = false;
    async function load() {
      try {
        const [ticketData, categoryData, productData] = await Promise.all([
          getSupportTickets(false), getCategories(), getAllProducts({ sort: "name,asc" }),
        ]);
        if (!disposed) {
          setTickets(ticketData);
          setCategories(categoryData);
          setProducts(productData);
        }
      } catch (error) {
        if (!disposed) toast.error(getApiErrorMessage(error, "Could not load support."));
      } finally {
        if (!disposed) setLoading(false);
      }
    }
    void load();
    const timer = window.setInterval(() => document.visibilityState === "visible" && void load(), 4000);
    return () => { disposed = true; window.clearInterval(timer); };
  }, []);

  async function createTicket(event: React.FormEvent) {
    event.preventDefault();
    if (!categoryId || !productId) return toast.error("Choose a category and product first.");
    try {
      const ticket = await createSupportTicket({
        categoryId: Number(categoryId), productId: Number(productId), subject: subject.trim(), message: message.trim(),
      });
      setTickets((current) => [ticket, ...current]);
      setOpenTicketId(ticket.id);
      setCategoryId(""); setProductId(""); setSubject(""); setMessage("");
      toast.success("Support ticket created.");
    } catch (error) { toast.error(getApiErrorMessage(error, "Could not create support ticket.")); }
  }

  async function reply(ticketId: number) {
    const body = replyDrafts[ticketId]?.trim();
    if (!body) return;
    try {
      const updated = await replySupportTicket(ticketId, body);
      setTickets((current) => current.map((ticket) => ticket.id === ticketId ? updated : ticket));
      setReplyDrafts((current) => ({ ...current, [ticketId]: "" }));
    } catch (error) { toast.error(getApiErrorMessage(error, "Could not send message.")); }
  }

  async function close(ticketId: number) {
    try {
      const updated = await closeSupportTicket(ticketId);
      setTickets((current) => current.map((ticket) => ticket.id === ticketId ? updated : ticket));
    } catch (error) { toast.error(getApiErrorMessage(error, "Could not close ticket.")); }
  }

  if (loading) return <main className="page-shell"><Loading label="Loading support" /></main>;

  return (
    <main className="page-shell support-page">
      <header className="page-heading compact-heading"><div><p className="section-kicker">Customer support</p><h1>Help for every product.</h1></div><p>Choose the product you need help with so the admin can identify it immediately.</p></header>
      <div className="support-layout">
        <form className="admin-table-card support-compose" onSubmit={createTicket}>
          <div className="admin-card-head"><h2>New ticket</h2><span>Support</span></div>
          <div className="account-card-body">
            <label className="form-field"><span>Category</span><select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setProductId(""); }} required><option value="">Choose category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label className="form-field"><span>Product</span><select value={productId} onChange={(e) => setProductId(e.target.value)} disabled={!categoryId} required><option value="">Choose product</option>{filteredProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
            <label className="form-field"><span>Subject</span><input value={subject} onChange={(e) => setSubject(e.target.value)} required /></label>
            <label className="form-field"><span>Message</span><textarea rows={6} value={message} onChange={(e) => setMessage(e.target.value)} required /></label>
            <button className="button button-primary">Create ticket</button>
          </div>
        </form>

        <section className="support-ticket-list">
          {tickets.length === 0 && <div className="inline-notice">No support tickets yet.</div>}
          {ticketPager.pageItems.map((ticket) => (
            <article className={`admin-table-card support-ticket ${openTicketId === ticket.id ? "" : "support-ticket-collapsed"}`} key={ticket.id}>
              <div className="admin-card-head">
                <div><h2>#{ticket.id} · {ticket.subject}</h2><small>{ticket.categoryName || "Category"} · {ticket.productName || "Product"}</small></div>
                <div className="row-actions"><span>{ticket.status}</span><button className="text-button support-ticket-toggle" type="button" onClick={() => setOpenTicketId((current) => current === ticket.id ? null : ticket.id)}>{openTicketId === ticket.id ? "Close chat" : "Open chat"}</button></div>
              </div>
              {openTicketId === ticket.id && (
                <>
                  <div className="support-messages">
                    {ticket.messages.map((item) => <div className={`support-message ${item.senderRole === "ADMIN" ? "is-admin" : "is-customer"}`} key={item.id}><strong>{item.senderName} · {item.senderRole}</strong><p>{item.message}</p><small>{formatDate(item.createdAt)}</small></div>)}
                  </div>
                  {ticket.status !== "CLOSED" && <div className="support-reply"><textarea rows={3} placeholder="Write a reply" value={replyDrafts[ticket.id] ?? ""} onChange={(e) => setReplyDrafts((current) => ({ ...current, [ticket.id]: e.target.value }))} /><div className="row-actions"><button className="button button-primary" type="button" onClick={() => void reply(ticket.id)}>Send</button><button className="text-button" type="button" onClick={() => void close(ticket.id)}>Close ticket</button></div></div>}
                </>
              )}
            </article>
          ))}
          <Pagination page={ticketPager.page} totalPages={ticketPager.totalPages} onPageChange={ticketPager.setPage} />
        </section>
      </div>
    </main>
  );
}
