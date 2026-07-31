import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  getAllOrders,
  getAllReviews,
  getUnreadAdminReviewCount,
  getUnreadAdminReviewCountsByProduct,
  markAllAdminReviewsRead,
  markProductReviewsRead,
  getCategories,
  getAllProducts,
  updateCategory,
  updateOrderStatus,
  processOrderReturn,
  shipOrder,
  updateProduct,
} from "../../api/storeApi";
import { getApiErrorMessage } from "../../api/client";
import { Loading } from "../../components/common/Loading";
import { Pagination } from "../../components/common/Pagination";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { usePagination } from "../../hooks/usePagination";
import type { Category, Order, OrderStatus, Product, Review } from "../../types";
import { formatCurrency, formatDate } from "../../utils/format";
import { broadcastOrdersChanged, subscribeToOrderChanges } from "../../utils/orderSync";

const LOW_STOCK_THRESHOLD = 5;

const nextStatuses: Record<OrderStatus, OrderStatus[]> = {
  // Payment is confirmed only by VNPay. Admin may cancel an unpaid order.
  PENDING: ["CANCELLED"],
  // After payment, admin can only hand the order over for shipping.
  PAID: ["SHIPPED"],
  // Delivery confirmation belongs to the customer.
  SHIPPED: [],
  DELIVERED: [],
  CANCELLED: [],
  RETURN_REQUESTED: [],
  RETURN_APPROVED: [],
  RETURN_REJECTED: [],
  RETURNED: [],
  RETURN_RECEIVED: [],
  REFUNDED: [],
  REFUND_CONFIRMED: [],
};

function statusOptions(status: OrderStatus) {
  return [status, ...nextStatuses[status]];
}

function statusLabel(status: OrderStatus) {
  return status
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/(^|\s)\S/g, (char) => char.toUpperCase());
}

const ADMIN_ACTION_STATUSES = new Set<OrderStatus>([
  "PAID",
  "RETURN_REQUESTED",
  "RETURNED",
  "RETURN_RECEIVED",
]);

type Tab = "overview" | "products" | "categories" | "orders" | "reviews";
type StockFilter = "all" | "low" | "out";
type OrderFilter = "ALL" | OrderStatus;
type ProductForm = { name: string; description: string; price: string; imageUrl: string; stockQuantity: string; categoryIds: number[] };
const blankProduct: ProductForm = { name: "", description: "", price: "", imageUrl: "", stockQuantity: "0", categoryIds: [] };
type CloudinaryUploadResponse = {
  secure_url?: unknown;
  error?: { message?: unknown };
};

export default function Admin() {
  const [tab, setTab] = useState<Tab>(() => window.location.hash === "#reviews" ? "reviews" : "overview");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [unreadReviewCount, setUnreadReviewCount] = useState(0);
  const [unreadReviewCountsByProduct, setUnreadReviewCountsByProduct] = useState<Record<number, number>>({});
  const [markingReviewsRead, setMarkingReviewsRead] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<ProductForm>(blankProduct);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [productQuery, setProductQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [orderQuery, setOrderQuery] = useState("");
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("ALL");
  const [reviewQuery, setReviewQuery] = useState("");
  const [selectedReviewProductId, setSelectedReviewProductId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: "product" | "category"; id: number; label: string } | null>(null);

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === "#reviews") setTab("reviews");
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    const nextHash = tab === "reviews" ? "#reviews" : "";
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${nextHash}`);
    }
  }, [tab]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      queueMicrotask(() => {
        if (!controller.signal.aborted) setLoading(true);
      });
      const results = await Promise.allSettled([
        getAllProducts({ sort: "createdAt,desc" }, controller.signal),
        getCategories(controller.signal),
        getAllOrders(controller.signal),
        getAllReviews(controller.signal),
      ]);

      if (controller.signal.aborted) return;

      const [productResult, categoryResult, orderResult, reviewResult] = results;
      const failedSections: string[] = [];

      if (productResult.status === "fulfilled") {
        setProducts(productResult.value);
      } else {
        setProducts([]);
        failedSections.push("products");
      }

      if (categoryResult.status === "fulfilled") {
        setCategories(categoryResult.value);
      } else {
        setCategories([]);
        failedSections.push("categories");
      }

      if (orderResult.status === "fulfilled") {
        setOrders([...orderResult.value].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)));
      } else {
        setOrders([]);
        failedSections.push("orders");
      }

      if (reviewResult.status === "fulfilled") {
        setReviews([...reviewResult.value].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)));
      } else {
        setReviews([]);
        failedSections.push("reviews");
      }

      try {
        const [unreadTotal, unreadByProduct] = await Promise.all([
          getUnreadAdminReviewCount(),
          getUnreadAdminReviewCountsByProduct(),
        ]);
        setUnreadReviewCount(unreadTotal);
        setUnreadReviewCountsByProduct(unreadByProduct);
      } catch {
        setUnreadReviewCount(0);
        setUnreadReviewCountsByProduct({});
      }

      if (failedSections.length > 0) {
        toast.error(`Could not load: ${failedSections.join(", ")}.`);
      }
      setLoading(false);
    }

    void loadData();
    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    let requestInFlight = false;

    async function refreshOrders() {
      if (requestInFlight) return;
      requestInFlight = true;

      try {
        const data = await getAllOrders();
        if (!disposed) {
          setOrders([...data].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)));
        }
      } catch {
        // The initial loader already reports connection errors. Background sync
        // stays silent and retries automatically on the next interval.
      } finally {
        requestInFlight = false;
      }
    }

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

  useEffect(() => {
    let disposed = false;
    let requestInFlight = false;

    async function refreshReviews() {
      if (requestInFlight) return;
      requestInFlight = true;
      try {
        const [data, unread, unreadByProduct] = await Promise.all([
          getAllReviews(),
          getUnreadAdminReviewCount(),
          getUnreadAdminReviewCountsByProduct(),
        ]);
        if (!disposed) {
          setReviews([...data].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)));
          setUnreadReviewCount(unread);
          setUnreadReviewCountsByProduct(unreadByProduct);
        }
      } catch {
        // Keep the admin page usable if a background refresh fails.
      } finally {
        requestInFlight = false;
      }
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshReviews();
    }, 3000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void refreshReviews();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const inventoryValue = useMemo(
    () => products.reduce((sum, product) => sum + product.price * product.stockQuantity, 0),
    [products],
  );

  // Badge count = orders that need an ADMIN action now.
  // Waiting-on-customer states (SHIPPED, RETURN_APPROVED, REFUNDED) and
  // completed states (DELIVERED, CANCELLED, RETURN_REJECTED, REFUND_CONFIRMED)
  // are intentionally excluded.
  const openOrders = useMemo(
    () => orders.filter((order) => ADMIN_ACTION_STATUSES.has(order.status)),
    [orders],
  );

  const deliveredRevenue = useMemo(
    () => orders.filter((order) => order.status === "DELIVERED").reduce((sum, order) => sum + order.totalAmount, 0),
    [orders],
  );

  const lowStockProducts = useMemo(
    () => products.filter((product) => product.stockQuantity > 0 && product.stockQuantity <= LOW_STOCK_THRESHOLD),
    [products],
  );

  const outOfStockProducts = useMemo(
    () => products.filter((product) => product.stockQuantity === 0),
    [products],
  );

  const attentionOrders = useMemo(
    () => orders.filter((order) => order.status === "PENDING" || order.status === "PAID").slice(0, 6),
    [orders],
  );

  const recentOrders = useMemo(() => orders.slice(0, 5), [orders]);

  const visibleProducts = useMemo(() => {
    const query = productQuery.trim().toLowerCase();
    return products.filter((product) => {
      const matchesQuery = !query
        || product.name.toLowerCase().includes(query)
        || product.categories.some((category) => category.name.toLowerCase().includes(query));
      const matchesStock = stockFilter === "all"
        || (stockFilter === "out" && product.stockQuantity === 0)
        || (stockFilter === "low" && product.stockQuantity > 0 && product.stockQuantity <= LOW_STOCK_THRESHOLD);
      return matchesQuery && matchesStock;
    });
  }, [productQuery, products, stockFilter]);

  const visibleOrders = useMemo(() => {
    const query = orderQuery.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus = orderFilter === "ALL" || order.status === orderFilter;
      const matchesQuery = !query
        || String(order.id).includes(query)
        || (order.userName || "").toLowerCase().includes(query)
        || (order.userEmail || "").toLowerCase().includes(query);
      return matchesStatus && matchesQuery;
    });
  }, [orderFilter, orderQuery, orders]);

  const averageRating = useMemo(
    () => reviews.length === 0 ? 0 : reviews.reduce((sum, review) => sum + review.stars, 0) / reviews.length,
    [reviews],
  );

  const reviewCountsByProduct = useMemo(() => {
    const counts = new Map<number, number>();
    reviews.forEach((review) => {
      if (review.productId) counts.set(review.productId, (counts.get(review.productId) || 0) + 1);
    });
    return counts;
  }, [reviews]);

  const visibleReviewProducts = useMemo(() => {
    const query = reviewQuery.trim().toLowerCase();
    return [...products]
      .filter((product) => !query
        || product.name.toLowerCase().includes(query)
        || String(product.id).includes(query)
        || product.categories.some((category) => category.name.toLowerCase().includes(query)))
      .sort((a, b) => {
        const reviewCountDifference = (reviewCountsByProduct.get(b.id) || 0) - (reviewCountsByProduct.get(a.id) || 0);
        return reviewCountDifference !== 0 ? reviewCountDifference : a.name.localeCompare(b.name);
      });
  }, [products, reviewCountsByProduct, reviewQuery]);

  const selectedReviewProduct = useMemo(
    () => selectedReviewProductId === null ? null : products.find((product) => product.id === selectedReviewProductId) || null,
    [products, selectedReviewProductId],
  );

  const selectedProductReviews = useMemo(
    () => selectedReviewProductId === null
      ? []
      : reviews.filter((review) => review.productId === selectedReviewProductId),
    [reviews, selectedReviewProductId],
  );

  const selectedProductAverageRating = useMemo(
    () => selectedProductReviews.length === 0
      ? 0
      : selectedProductReviews.reduce((sum, review) => sum + review.stars, 0) / selectedProductReviews.length,
    [selectedProductReviews],
  );

  const productPager = usePagination(visibleProducts, 10);
  const categoryPager = usePagination(categories, 10);
  const orderPager = usePagination(visibleOrders, 10);
  const reviewProductPager = usePagination(visibleReviewProducts, 10);
  const selectedReviewPager = usePagination(selectedProductReviews, 10);

  const categoryProductCounts = useMemo(() => {
    const counts = new Map<number, number>();
    products.forEach((product) => {
      product.categories.forEach((category) => counts.set(category.id, (counts.get(category.id) || 0) + 1));
    });
    return counts;
  }, [products]);

  async function openReviewProduct(productId: number) {
    setSelectedReviewProductId(productId);
    try {
      const remaining = await markProductReviewsRead(productId);
      setUnreadReviewCount(remaining);
      setUnreadReviewCountsByProduct((current) => {
        const next = { ...current };
        delete next[productId];
        return next;
      });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not mark these reviews as read."));
    }
  }

  async function markAllReviewsRead() {
    if (markingReviewsRead || unreadReviewCount === 0) return;
    try {
      setMarkingReviewsRead(true);
      const remaining = await markAllAdminReviewsRead();
      setUnreadReviewCount(remaining);
      setUnreadReviewCountsByProduct({});
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not mark all reviews as read."));
    } finally {
      setMarkingReviewsRead(false);
    }
  }

  function editProduct(product: Product) {
    setTab("products");
    setEditingProductId(product.id);
    setForm({
      name: product.name,
      description: product.description || "",
      price: String(product.price),
      imageUrl: product.imageUrl || "",
      stockQuantity: String(product.stockQuantity),
      categoryIds: product.categories.map((category) => category.id),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetProductForm() {
    setEditingProductId(null);
    setForm(blankProduct);
  }

  async function uploadProductImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Choose an image smaller than 10 MB.");
      return;
    }

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) {
      toast.error("Cloudinary upload is not configured. Set the VITE_CLOUDINARY_* build variables first.");
      return;
    }

    setUploadingImage(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("upload_preset", uploadPreset);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body });
      const result = await response.json() as CloudinaryUploadResponse;
      if (!response.ok) {
        const message = typeof result.error?.message === "string" && result.error.message.trim()
          ? result.error.message
          : "Could not upload the image.";
        throw new Error(message);
      }
      if (typeof result.secure_url !== "string" || !result.secure_url.trim()) {
        throw new Error("Cloudinary did not return an image URL.");
      }

      setForm((current) => ({ ...current, imageUrl: result.secure_url as string }));
      toast.success("Image uploaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload the image.");
    } finally {
      setUploadingImage(false);
    }
  }

  async function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const price = Number(form.price);
    const stockQuantity = Number(form.stockQuantity);
    if (!form.name.trim() || !Number.isFinite(price) || price <= 0 || !Number.isInteger(stockQuantity) || stockQuantity < 0) {
      toast.error("Enter a name, a positive price and a valid stock quantity.");
      return;
    }
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), description: form.description.trim(), price, imageUrl: form.imageUrl.trim(), stockQuantity, categoryIds: form.categoryIds };
      const saved = editingProductId ? await updateProduct(editingProductId, payload) : await createProduct(payload);
      setProducts((current) => editingProductId ? current.map((product) => product.id === saved.id ? saved : product) : [saved, ...current]);
      toast.success(editingProductId ? "Product updated." : "Product created.");
      resetProductForm();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not save the product."));
    } finally {
      setSaving(false);
    }
  }

  async function removeProduct(id: number) {
    try {
      await deleteProduct(id);
      setProducts((current) => current.filter((product) => product.id !== id));
      toast.success("Product deleted.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not delete the product."));
    }
  }

  async function saveCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = categoryName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const saved = editingCategoryId ? await updateCategory(editingCategoryId, name) : await createCategory(name);
      setCategories((current) => editingCategoryId ? current.map((category) => category.id === saved.id ? saved : category) : [...current, saved]);
      if (editingCategoryId) {
        setProducts((current) => current.map((product) => ({
          ...product,
          categories: product.categories.map((category) => category.id === saved.id ? saved : category),
        })));
      }
      setCategoryName("");
      setEditingCategoryId(null);
      toast.success(editingCategoryId ? "Category updated." : "Category created.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not save the category."));
    } finally {
      setSaving(false);
    }
  }

  async function removeCategory(id: number) {
    try {
      await deleteCategory(id);
      setCategories((current) => current.filter((category) => category.id !== id));
      setProducts((current) => current.map((product) => ({
        ...product,
        categories: product.categories.filter((category) => category.id !== id),
      })));
      setForm((current) => ({
        ...current,
        categoryIds: current.categoryIds.filter((categoryId) => categoryId !== id),
      }));
      if (editingCategoryId === id) {
        setEditingCategoryId(null);
        setCategoryName("");
      }
      toast.success("Category deleted.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not delete the category. It may still be assigned to products."));
    }
  }

  async function changeOrderStatus(orderId: number, status: OrderStatus) {
    const currentOrder = orders.find((order) => order.id === orderId);
    if (!currentOrder || currentOrder.status === status) return;

    setUpdatingOrderId(orderId);
    try {
      let updated: Order;
      if (currentOrder.status === "PAID" && status === "SHIPPED") {
        updated = await shipOrder(orderId);
      } else {
        updated = await updateOrderStatus(orderId, status);
      }
      setOrders((current) => current.map((order) => order.id === orderId ? updated : order));
      broadcastOrdersChanged(orderId);

      if (status === "CANCELLED") {
        try {
          setProducts(await getAllProducts({ sort: "createdAt,desc" }));
        } catch {
          toast.warn("Order cancelled, but inventory could not be refreshed automatically.");
        }
      }

      toast.success(`Order #${orderId} moved to ${statusLabel(status)}.`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not update the order."));
    } finally {
      setUpdatingOrderId(null);
    }
  }

  async function handleReturnAction(orderId: number, status: OrderStatus) {
    setUpdatingOrderId(orderId);
    try {
      const updated = await processOrderReturn(orderId, status);
      setOrders((current) => current.map((order) => order.id === orderId ? updated : order));
      broadcastOrdersChanged(orderId);
      toast.success(`Order #${orderId}: ${statusLabel(status)}.`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not update the return workflow."));
    } finally {
      setUpdatingOrderId(null);
    }
  }

  if (loading) return <main className="page-shell"><Loading label="Loading admin workspace" /></main>;

  return (
    <main className="page-shell admin-page">
      <header className="page-heading compact-heading admin-heading">
        <div>
          <p className="section-kicker">Admin workspace</p>
          <h1>Run the shop.</h1>
        </div>
        <div className="admin-heading-copy">
          <span className="admin-live-badge"><i /> Store operations</span>
          <p>Manage inventory, taxonomy and fulfillment from one focused view.</p>
        </div>
      </header>

      <section className="admin-stats admin-stats-six">
        <div><span>Products</span><strong>{products.length}</strong></div>
        <div><span>Needs action</span><strong>{openOrders.length}</strong></div>
        <div><span>Low stock</span><strong>{lowStockProducts.length}</strong></div>
        <div><span>Out of stock</span><strong>{outOfStockProducts.length}</strong></div>
        <div><span>Delivered revenue</span><strong>{formatCurrency(deliveredRevenue)}</strong></div>
        <div><span>Inventory value</span><strong>{formatCurrency(inventoryValue)}</strong></div>
      </section>

      <nav className="admin-tabs" aria-label="Admin workspace sections">
        {(["overview", "categories", "products", "orders", "reviews"] as Tab[]).map((item) => (
          <button className={tab === item ? "is-active" : ""} key={item} onClick={() => setTab(item)}>
            {item}
            {item === "orders" && openOrders.length > 0 && <span className="admin-tab-count">{openOrders.length}</span>}
            {item === "reviews" && unreadReviewCount > 0 && <span className="admin-tab-count">{unreadReviewCount}</span>}
          </button>
        ))}
      </nav>

      {tab === "overview" && (
        <div className="admin-overview">
          <section className="admin-quick-actions" aria-label="Quick actions">
            <button onClick={() => setTab("categories")}><span>⌘</span><strong>New category</strong><small>Organize the storefront</small></button>
            <button onClick={() => setTab("products")}><span>+</span><strong>Add product</strong><small>Create a new catalog item</small></button>
            <button onClick={() => setTab("orders")}><span>↗</span><strong>Process orders</strong><small>{openOrders.length} need admin action</small></button>
          </section>

          <div className="admin-overview-grid">
            <section className="admin-table-card admin-attention-card">
              <div className="admin-card-head">
                <div><p className="section-kicker">Needs attention</p><h2>Inventory health</h2></div>
                <span>{lowStockProducts.length + outOfStockProducts.length} flagged</span>
              </div>
              {lowStockProducts.length === 0 && outOfStockProducts.length === 0 ? (
                <div className="admin-good-state"><span>✓</span><div><strong>Inventory looks healthy</strong><p>No products are low or out of stock.</p></div></div>
              ) : (
                <div className="admin-attention-list">
                  {[...outOfStockProducts, ...lowStockProducts].slice(0, 7).map((product) => (
                    <button key={product.id} onClick={() => editProduct(product)}>
                      <span><strong>{product.name}</strong><small>{product.categories.map((category) => category.name).join(" · ") || "Uncategorized"}</small></span>
                      <span className={`inventory-alert ${product.stockQuantity === 0 ? "is-out" : "is-low"}`}>
                        {product.stockQuantity === 0 ? "Out" : `${product.stockQuantity} left`}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="admin-table-card">
              <div className="admin-card-head">
                <div><p className="section-kicker">Fulfillment queue</p><h2>Orders to process</h2></div>
                <button className="text-button" onClick={() => setTab("orders")}>View all</button>
              </div>
              {attentionOrders.length === 0 ? (
                <div className="admin-good-state"><span>✓</span><div><strong>Queue is clear</strong><p>No pending or paid orders need action.</p></div></div>
              ) : (
                <div className="admin-attention-list order-attention-list">
                  {attentionOrders.map((order) => (
                    <button key={order.id} onClick={() => setTab("orders")}>
                      <span><strong>Order #{order.id}</strong><small>{order.userName || order.userEmail || "Customer"} · {formatDate(order.createdAt)}</small></span>
                      <span className={`status-pill status-${order.status.toLowerCase()}`}>{statusLabel(order.status)}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="admin-table-card admin-recent-orders">
            <div className="admin-card-head">
              <div><p className="section-kicker">Latest activity</p><h2>Recent orders</h2></div>
              <button className="text-button" onClick={() => setTab("orders")}>Manage orders</button>
            </div>
            {recentOrders.length === 0 ? (
              <div className="inline-notice admin-empty">No orders yet.</div>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead><tr><th>Order</th><th>Customer</th><th>Gmail</th><th>Placed</th><th>Items</th><th>Total</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>{recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td><Link className="text-link" to={`/admin/orders/${order.id}`}><strong>#{order.id}</strong></Link><small>View details</small></td>
                      <td><strong>{order.userName || "Customer"}</strong></td>
                      <td>{order.userEmail || "—"}</td>
                      <td>{formatDate(order.createdAt)}</td>
                      <td>{order.totalItems}</td>
                      <td>{formatCurrency(order.totalAmount)}</td>
                      <td><span className={`status-pill status-${order.status.toLowerCase()}`}>{statusLabel(order.status)}</span></td>
                      <td><Link className="text-link" to={`/admin/orders/${order.id}`}>View</Link></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {tab === "products" && (
        <>
          <section className="admin-toolbar">
            <label className="admin-search-field">
              <span>Search inventory</span>
              <input value={productQuery} onChange={(event) => setProductQuery(event.target.value)} placeholder="Product or category" />
            </label>
            <div className="admin-filter-pills" aria-label="Stock filters">
              <button className={stockFilter === "all" ? "is-active" : ""} onClick={() => setStockFilter("all")}>All <span>{products.length}</span></button>
              <button className={stockFilter === "low" ? "is-active" : ""} onClick={() => setStockFilter("low")}>Low stock <span>{lowStockProducts.length}</span></button>
              <button className={stockFilter === "out" ? "is-active" : ""} onClick={() => setStockFilter("out")}>Out <span>{outOfStockProducts.length}</span></button>
            </div>
          </section>

          <div className="admin-split">
            <form className="admin-form-card" onSubmit={saveProduct}>
              <div className="admin-form-title"><div><p className="section-kicker">{editingProductId ? "Edit product" : "New product"}</p><h2>{editingProductId ? `Product #${editingProductId}` : "Add to catalog"}</h2></div>{editingProductId && <button type="button" className="text-button" onClick={resetProductForm}>Cancel</button>}</div>
              <label className="form-field"><span>Name</span><input value={form.name} maxLength={150} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
              <label className="form-field"><span>Description</span><textarea rows={5} maxLength={2000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
              <div className="form-grid-two"><label className="form-field"><span>Price (USD)</span><input type="number" min="0.01" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label><label className="form-field"><span>Stock</span><input type="number" min="0" step="1" value={form.stockQuantity} onChange={(event) => setForm({ ...form, stockQuantity: event.target.value })} /></label></div>
              <div className="form-field image-upload-field">
                <span>Product image</span>
                <div className="image-upload-preview">
                  {form.imageUrl ? <img src={form.imageUrl} alt={form.name ? `${form.name} preview` : "Product preview"} /> : <small>No image uploaded</small>}
                </div>
                <label className={`button button-secondary button-full upload-button${saving || uploadingImage ? " is-disabled" : ""}`}>
                  <input type="file" accept="image/*" disabled={saving || uploadingImage} onChange={(event) => void uploadProductImage(event)} />
                  {uploadingImage ? "Uploading…" : form.imageUrl ? "Replace image" : "Upload image"}
                </label>
                <label className="form-field image-url-fallback"><span>Or paste image URL</span><input type="url" value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} placeholder="https://…" /></label>
                {form.imageUrl && <button type="button" className="text-button" disabled={saving || uploadingImage} onClick={() => setForm({ ...form, imageUrl: "" })}>Remove image</button>}
              </div>
              <fieldset className="category-checks"><legend>Categories</legend>{categories.map((category) => <label key={category.id}><input type="checkbox" checked={form.categoryIds.includes(category.id)} onChange={(event) => setForm({ ...form, categoryIds: event.target.checked ? [...form.categoryIds, category.id] : form.categoryIds.filter((id) => id !== category.id) })} /><span>{category.name}</span></label>)}</fieldset>
              <button className="button button-primary button-full" disabled={saving || uploadingImage}>{saving ? "Saving…" : editingProductId ? "Update product" : "Create product"}</button>
            </form>
            <section className="admin-table-card">
              <div className="admin-card-head"><h2>Inventory</h2><span>{visibleProducts.length} of {products.length} products</span></div>
              {visibleProducts.length === 0 ? (
                <div className="inline-notice admin-empty">No products match the current search or stock filter.</div>
              ) : (
                <div className="table-scroll"><table><thead><tr><th>Product</th><th>Price</th><th>Stock</th><th>Categories</th><th /></tr></thead><tbody>{productPager.pageItems.map((product) => <tr key={product.id}><td><strong>{product.name}</strong><small>#{product.id}</small></td><td>{formatCurrency(product.price)}</td><td><span className={product.stockQuantity === 0 ? "table-stock is-out" : product.stockQuantity <= LOW_STOCK_THRESHOLD ? "table-stock is-low" : "table-stock"}>{product.stockQuantity}</span></td><td>{product.categories.map((category) => category.name).join(", ") || "—"}</td><td><div className="row-actions"><button onClick={() => editProduct(product)}>Edit</button><button className="danger-text" onClick={() => setDeleteTarget({ kind: "product", id: product.id, label: product.name })}>Delete</button></div></td></tr>)}</tbody></table></div>
              )}
              <Pagination page={productPager.page} totalPages={productPager.totalPages} onPageChange={productPager.setPage} />
            </section>
          </div>
        </>
      )}

      {tab === "categories" && (
        <div className="admin-split category-admin">
          <form className="admin-form-card" onSubmit={saveCategory}><div className="admin-form-title"><div><p className="section-kicker">Taxonomy</p><h2>{editingCategoryId ? "Rename category" : "New category"}</h2></div></div><label className="form-field"><span>Category name</span><input maxLength={100} value={categoryName} onChange={(event) => setCategoryName(event.target.value)} /></label><button className="button button-primary button-full" disabled={saving}>{editingCategoryId ? "Save new name" : "Create category"}</button>{editingCategoryId && <button type="button" className="text-button" onClick={() => { setEditingCategoryId(null); setCategoryName(""); }}>Cancel edit</button>}</form>
          <section className="admin-table-card"><div className="admin-card-head"><h2>Categories</h2><span>{categories.length} total</span></div><div className="category-list">{categoryPager.pageItems.map((category) => <div key={category.id}><span><small>#{category.id}</small><strong>{category.name}</strong><em>{categoryProductCounts.get(category.id) || 0} products</em></span><span className="row-actions"><button onClick={() => { setProductQuery(category.name); setStockFilter("all"); productPager.setPage(1); setTab("products"); }}>View products</button><button onClick={() => { setEditingCategoryId(category.id); setCategoryName(category.name); }}>Rename</button><button className="danger-text" onClick={() => setDeleteTarget({ kind: "category", id: category.id, label: category.name })}>Delete</button></span></div>)}</div><Pagination page={categoryPager.page} totalPages={categoryPager.totalPages} onPageChange={categoryPager.setPage} /></section>
        </div>
      )}

      {tab === "orders" && (
        <section className="admin-table-card">
          <div className="admin-card-head"><div><h2>All orders</h2><span className="admin-card-subtitle">Search customers and move orders through fulfillment.</span></div><span>{visibleOrders.length} of {orders.length} orders</span></div>
          <div className="admin-toolbar admin-toolbar-contained">
            <label className="admin-search-field">
              <span>Search orders</span>
              <input value={orderQuery} onChange={(event) => setOrderQuery(event.target.value)} placeholder="Order ID, customer or email" />
            </label>
            <label className="admin-status-filter">
              <span>Status</span>
              <select value={orderFilter} onChange={(event) => setOrderFilter(event.target.value as OrderFilter)}>
                <option value="ALL">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="PAID">Paid</option>
                <option value="SHIPPED">Shipped</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="RETURN_REQUESTED">Return requested</option>
                <option value="RETURN_APPROVED">Return approved</option>
                <option value="RETURN_REJECTED">Return rejected</option>
                <option value="RETURNED">Returned</option>
                <option value="RETURN_RECEIVED">Return received</option>
                <option value="REFUNDED">Refunded</option>
                <option value="REFUND_CONFIRMED">Refund confirmed</option>
              </select>
            </label>
          </div>
          {orders.length === 0 ? (
            <div className="inline-notice admin-empty">No orders yet. Sign in as a customer, add products to the cart and place an order.</div>
          ) : visibleOrders.length === 0 ? (
            <div className="inline-notice admin-empty">No orders match the current search or status filter.</div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead><tr><th>Order</th><th>Customer</th><th>Gmail</th><th>Placed</th><th>Items</th><th>Total</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>{orderPager.pageItems.map((order) => (
                  <tr key={order.id}>
                    <td><Link className="text-link" to={`/admin/orders/${order.id}`}><strong>#{order.id}</strong></Link><small>View details</small></td>
                    <td><strong>{order.userName || "Customer"}</strong></td>
                    <td>{order.userEmail || "—"}</td>
                    <td>{formatDate(order.createdAt)}</td>
                    <td>{order.totalItems}</td>
                    <td>{formatCurrency(order.totalAmount)}</td>
                    <td>
                      <select
                        className={`status-select status-${order.status.toLowerCase()}`}
                        value={order.status}
                        disabled={updatingOrderId === order.id || nextStatuses[order.status].length === 0}
                        onChange={(event) => void changeOrderStatus(order.id, event.target.value as OrderStatus)}
                        aria-label={`Status for order ${order.id}`}
                      >
                        {statusOptions(order.status).map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                      </select>
                    </td>
                    <td>
                      <div className="row-actions">
                        {order.status === "RETURN_REQUESTED" && (
                          <>
                            <button className="return-action return-action-approve" disabled={updatingOrderId === order.id} onClick={() => void handleReturnAction(order.id, "RETURN_APPROVED")}>Approve return</button>
                            <button className="return-action return-action-reject" disabled={updatingOrderId === order.id} onClick={() => void handleReturnAction(order.id, "RETURN_REJECTED")}>Reject</button>
                          </>
                        )}
                        {order.status === "RETURN_APPROVED" && <span className="return-action-waiting">Waiting for customer return</span>}
                        {order.status === "RETURNED" && <button className="return-action return-action-receive" disabled={updatingOrderId === order.id} onClick={() => void handleReturnAction(order.id, "RETURN_RECEIVED")}>Confirm received</button>}
                        {order.status === "RETURN_RECEIVED" && <button className="return-action return-action-refund" disabled={updatingOrderId === order.id} onClick={() => void handleReturnAction(order.id, "REFUNDED")}>Refund</button>}
                        {order.status === "REFUNDED" && <span className="return-action-waiting">Waiting for customer refund confirmation</span>}
                        {order.status === "REFUND_CONFIRMED" && <span className="return-action-waiting return-action-complete">Completed</span>}
                        {!['RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURNED', 'RETURN_RECEIVED', 'REFUNDED', 'REFUND_CONFIRMED'].includes(order.status) && <span>—</span>}
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
          <Pagination page={orderPager.page} totalPages={orderPager.totalPages} onPageChange={orderPager.setPage} />
        </section>
      )}

      {tab === "reviews" && (
        <section className="admin-table-card admin-reviews-card">
          {selectedReviewProduct ? (
            <>
              <div className="admin-card-head admin-review-detail-head">
                <div>
                  <button type="button" className="text-button admin-review-back" onClick={() => setSelectedReviewProductId(null)}>
                    ← Back to products
                  </button>
                  <p className="section-kicker">Product reviews</p>
                  <h2>{selectedReviewProduct.name}</h2>
                  <div className="admin-review-product-categories">
                    {selectedReviewProduct.categories.length > 0
                      ? selectedReviewProduct.categories.map((category) => <span key={category.id}>{category.name}</span>)
                      : <span>Uncategorized</span>}
                  </div>
                </div>
                <span>
                  {selectedProductReviews.length} reviews
                  {selectedProductReviews.length > 0 ? ` · ${selectedProductAverageRating.toFixed(1)} / 5 avg` : ""}
                </span>
              </div>

              {selectedProductReviews.length === 0 ? (
                <div className="inline-notice admin-empty">No customer reviews for this product yet.</div>
              ) : (
                <div className="table-scroll">
                  <table className="admin-review-table admin-review-detail-table">
                    <thead>
                      <tr><th>Customer</th><th>Rating</th><th>Review</th><th>Posted</th></tr>
                    </thead>
                    <tbody>
                      {selectedReviewPager.pageItems.map((review) => (
                        <tr key={review.id}>
                          <td>
                            <strong>{review.userName}</strong>
                            <small>Customer #{review.userId}</small>
                          </td>
                          <td>
                            <span className="admin-review-stars" aria-label={`${review.stars} out of 5 stars`}>
                              {"★".repeat(review.stars)}<i>{"★".repeat(5 - review.stars)}</i>
                            </span>
                            <small>{review.stars} / 5</small>
                          </td>
                          <td className="admin-review-comment">
                            {review.comment?.trim() || <span className="admin-review-empty-comment">No written comment.</span>}
                          </td>
                          <td>
                            <strong>{formatDate(review.createdAt)}</strong>
                            <small>Review #{review.id}</small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Pagination page={selectedReviewPager.page} totalPages={selectedReviewPager.totalPages} onPageChange={selectedReviewPager.setPage} />
            </>
          ) : (
            <>
              <div className="admin-card-head">
                <div>
                  <h2>Product reviews</h2>
                  <span className="admin-card-subtitle">Choose a product to see all customer reviews for that product.</span>
                </div>
                <div className="admin-review-summary-actions">
                  <span>{products.length} products · {reviews.length} reviews · {reviews.length > 0 ? `${averageRating.toFixed(1)} / 5 avg` : "No ratings yet"}</span>
                  <button type="button" className="text-button" disabled={unreadReviewCount === 0 || markingReviewsRead} onClick={() => void markAllReviewsRead()}>
                    {markingReviewsRead ? "Marking…" : `Mark all reviews read${unreadReviewCount > 0 ? ` (${unreadReviewCount})` : ""}`}
                  </button>
                </div>
              </div>

              <div className="admin-toolbar admin-toolbar-contained">
                <label className="admin-search-field">
                  <span>Search products</span>
                  <input
                    value={reviewQuery}
                    onChange={(event) => setReviewQuery(event.target.value)}
                    placeholder="Product name, product ID or category"
                  />
                </label>
              </div>

              {products.length === 0 ? (
                <div className="inline-notice admin-empty">No products available.</div>
              ) : visibleReviewProducts.length === 0 ? (
                <div className="inline-notice admin-empty">No products match the current search.</div>
              ) : (
                <div className="table-scroll">
                  <table className="admin-review-products-table">
                    <thead>
                      <tr><th>Product</th><th>Category</th><th>Reviews</th><th>Average rating</th><th /></tr>
                    </thead>
                    <tbody>
                      {reviewProductPager.pageItems.map((product) => {
                        const productReviews = reviews.filter((review) => review.productId === product.id);
                        const productAverage = productReviews.length === 0
                          ? 0
                          : productReviews.reduce((sum, review) => sum + review.stars, 0) / productReviews.length;

                        return (
                          <tr key={product.id} className="admin-review-product-row" onClick={() => void openReviewProduct(product.id)}>
                            <td>
                              <button type="button" className="admin-review-product-link" onClick={(event) => { event.stopPropagation(); void openReviewProduct(product.id); }}>
                                <strong>{product.name}</strong>
                                <small>Product #{product.id}</small>
                              </button>
                            </td>
                            <td>
                              <div className="admin-review-product-categories">
                                {product.categories.length > 0
                                  ? product.categories.map((category) => <span key={category.id}>{category.name}</span>)
                                  : <span>Uncategorized</span>}
                              </div>
                            </td>
                            <td>
                              {(unreadReviewCountsByProduct[product.id] || 0) > 0
                                ? <strong>{productReviews.length}</strong>
                                : <span>{productReviews.length}</span>}
                              <small>
                                {(unreadReviewCountsByProduct[product.id] || 0) > 0
                                  ? `${unreadReviewCountsByProduct[product.id]} unread`
                                  : (productReviews.length === 1 ? "review · read" : "reviews · read")}
                              </small>
                            </td>
                            <td>
                              {productReviews.length > 0 ? (
                                <>
                                  <span className="admin-review-stars" aria-label={`${productAverage.toFixed(1)} out of 5 stars`}>
                                    {"★".repeat(Math.round(productAverage))}<i>{"★".repeat(5 - Math.round(productAverage))}</i>
                                  </span>
                                  <small>{productAverage.toFixed(1)} / 5</small>
                                </>
                              ) : <span className="admin-review-empty-comment">No ratings</span>}
                            </td>
                            <td><button type="button" className="text-button" onClick={(event) => { event.stopPropagation(); void openReviewProduct(product.id); }}>View reviews →</button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <Pagination page={reviewProductPager.page} totalPages={reviewProductPager.totalPages} onPageChange={reviewProductPager.setPage} />
            </>
          )}
        </section>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={deleteTarget?.kind === "product" ? "Delete product?" : "Delete category?"}
        message={deleteTarget ? <>You are about to delete <strong>{deleteTarget.label}</strong>. This action cannot be undone.</> : undefined}
        confirmLabel="Delete"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          const target = deleteTarget;
          setDeleteTarget(null);
          if (!target) return;
          if (target.kind === "product") void removeProduct(target.id);
          else void removeCategory(target.id);
        }}
      />
    </main>
  );
}
