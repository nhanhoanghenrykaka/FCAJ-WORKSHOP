import type {
  Address,
  AdminDashboard,
  AppNotification,
  AuditLog,
  Cart,
  CartItem,
  Category,
  Coupon,
  CustomerSummary,
  InventoryTransaction,
  Order,
  OrderHistory,
  OrderItem,
  OrderStatus,
  NotificationType,
  PageResponse,
  Product,
  Review,
  SupportTicket,
  User,
} from "../types";
import { apiClient } from "./client";

export type ProductFilters = {
  keyword?: string;
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  size?: number;
  sort?: string;
};

export type ProductPayload = {
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  stockQuantity: number;
  categoryIds: number[];
};

type UnknownRecord = Record<string, unknown>;

type RawCartItem = UnknownRecord;
type RawCart = UnknownRecord;

const orderStatuses: OrderStatus[] = ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED", "RETURN_REQUESTED", "RETURN_APPROVED", "RETURN_REJECTED", "RETURNED", "RETURN_RECEIVED", "REFUNDED", "REFUND_CONFIRMED"];
const notificationTypes: NotificationType[] = [
  "ACCOUNT", "CART", "ORDER", "PAYMENT", "REVIEW", "PRODUCT", "CATEGORY",
  "WISHLIST", "INVENTORY", "PROMOTION", "SUPPORT", "RETURN", "SYSTEM",
];

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function unwrapData(value: unknown): unknown {
  const source = record(value);
  if ("data" in source && source.data !== undefined) return source.data;
  return value;
}

function finiteNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nonNegativeNumber(value: unknown, fallback = 0) {
  return Math.max(0, finiteNumber(value, fallback));
}

function nonNegativeInteger(value: unknown, fallback = 0) {
  return Math.max(0, Math.trunc(finiteNumber(value, fallback)));
}

function positiveId(value: unknown): number | null {
  const parsed = finiteNumber(value, Number.NaN);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() || fallback : fallback;
}

function nullableText(value: unknown) {
  const normalized = text(value);
  return normalized || null;
}

function dateText(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "";
  return Number.isNaN(Date.parse(value)) ? "" : value;
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeCategory(raw: unknown): Category {
  const source = record(raw);
  return {
    id: positiveId(source.id) ?? 0,
    name: text(source.name, "Unnamed category"),
  };
}

function normalizeProduct(raw: unknown): Product {
  const source = record(raw);
  return {
    id: positiveId(source.id) ?? 0,
    name: text(source.name, "Unnamed product"),
    description: nullableText(source.description),
    price: nonNegativeNumber(source.price),
    imageUrl: nullableText(source.imageUrl),
    stockQuantity: nonNegativeInteger(source.stockQuantity),
    createdAt: dateText(source.createdAt),
    categories: arrayValue(source.categories)
      .map(normalizeCategory)
      .filter((category) => category.id > 0),
  };
}

function normalizeProductPage(raw: unknown, fallbackSize = 12): PageResponse<Product> {
  const source = record(unwrapData(raw));
  const page = record(source.page);
  const content = arrayValue(source.content).map(normalizeProduct).filter((product) => product.id > 0);
  const size = nonNegativeInteger(source.size ?? page.size, fallbackSize) || fallbackSize;
  const number = nonNegativeInteger(source.number ?? page.number, 0);
  const totalElements = nonNegativeInteger(source.totalElements ?? page.totalElements, content.length);
  const computedPages = totalElements > 0 ? Math.ceil(totalElements / size) : 0;
  const totalPages = nonNegativeInteger(source.totalPages ?? page.totalPages, computedPages);
  const first = typeof source.first === "boolean" ? source.first : number === 0;
  const last = typeof source.last === "boolean"
    ? source.last
    : totalPages === 0 || number >= totalPages - 1;
  const empty = typeof source.empty === "boolean" ? source.empty : content.length === 0;

  return { content, totalElements, totalPages, size, number, first, last, empty };
}

function normalizeCart(raw: unknown): Cart {
  const source = record(unwrapData(raw)) as RawCart;
  const rawItems = arrayValue(source.items) as RawCartItem[];

  const items = rawItems.map((item): CartItem => {
    const quantity = Math.max(1, nonNegativeInteger(item.quantity, 1));
    const unitPrice = nonNegativeNumber(item.unitPrice);
    const rawStock = finiteNumber(item.stockQuantity, Number.NaN);
    const stockQuantity = Number.isFinite(rawStock) && rawStock >= 0
      ? Math.trunc(rawStock)
      : null;

    return {
      itemId: positiveId(item.itemId ?? item.id),
      productId: positiveId(item.productId) ?? 0,
      productName: text(item.productName, "Unnamed product"),
      imageUrl: nullableText(item.imageUrl),
      stockQuantity,
      unitPrice,
      quantity,
      subtotal: nonNegativeNumber(item.subtotal, unitPrice * quantity),
    };
  }).filter((item) => item.productId > 0);

  const computedItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const computedPrice = items.reduce((sum, item) => sum + item.subtotal, 0);

  return {
    items,
    totalItems: nonNegativeInteger(source.totalItems, computedItems),
    totalPrice: nonNegativeNumber(source.totalPrice, computedPrice),
  };
}

function normalizeReview(raw: unknown): Review {
  const source = record(raw);
  const stars = Math.min(5, Math.max(1, nonNegativeInteger(source.stars, 1)));
  return {
    id: positiveId(source.id) ?? 0,
    stars,
    comment: nullableText(source.comment),
    createdAt: dateText(source.createdAt),
    userId: positiveId(source.userId) ?? 0,
    userName: text(source.userName, "Customer"),
    productId: positiveId(source.productId),
    productName: nullableText(source.productName),
    verifiedPurchase: source.verifiedPurchase === true,
  };
}

function normalizeOrderItem(raw: unknown): OrderItem {
  const source = record(raw);
  const quantity = Math.max(1, nonNegativeInteger(source.quantity, 1));
  const priceAtPurchase = nonNegativeNumber(source.priceAtPurchase);
  return {
    productId: positiveId(source.productId) ?? 0,
    productName: text(source.productName, "Unnamed product"),
    quantity,
    priceAtPurchase,
    subtotal: nonNegativeNumber(source.subtotal, priceAtPurchase * quantity),
  };
}

function normalizeOrder(raw: unknown): Order {
  const source = record(raw);
  const rawStatus = text(source.status).toUpperCase() as OrderStatus;
  const items = arrayValue(source.items)
    .map(normalizeOrderItem)
    .filter((item) => item.productId > 0);
  const computedItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const computedAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

  return {
    id: positiveId(source.id) ?? 0,
    status: orderStatuses.includes(rawStatus) ? rawStatus : "PENDING",
    totalAmount: nonNegativeNumber(source.totalAmount, computedAmount),
    shippingFee: nonNegativeNumber(source.shippingFee),
    discountAmount: nonNegativeNumber(source.discountAmount),
    shippingMethod: text(source.shippingMethod, "STANDARD"),
    shippingAddress: nullableText(source.shippingAddress),
    receiverName: nullableText(source.receiverName),
    receiverPhone: nullableText(source.receiverPhone),
    carrier: nullableText(source.carrier),
    trackingNumber: nullableText(source.trackingNumber),
    couponCode: nullableText(source.couponCode),
    returnReason: nullableText(source.returnReason),
    totalItems: nonNegativeInteger(source.totalItems, computedItems),
    createdAt: dateText(source.createdAt),
    userId: positiveId(source.userId),
    userName: nullableText(source.userName),
    userEmail: nullableText(source.userEmail),
    vnpayTransId: nullableText(source.vnpayTransId),
    items,
  };
}

function normalizeNotification(raw: unknown): AppNotification {
  const source = record(raw);
  const rawType = text(source.type).toUpperCase() as NotificationType;
  const rawRole = text(source.actorRole).toUpperCase();
  const actorRole = rawRole === "USER" || rawRole === "ADMIN" ? rawRole : null;

  return {
    id: positiveId(source.id) ?? 0,
    actorUserId: positiveId(source.actorUserId),
    actorName: nullableText(source.actorName),
    actorRole,
    type: notificationTypes.includes(rawType) ? rawType : "ACCOUNT",
    title: text(source.title, "Activity update"),
    message: text(source.message),
    targetUrl: nullableText(source.targetUrl),
    read: source.read === true,
    createdAt: dateText(source.createdAt),
  };
}

function requireEntityId(id: number, entity: string) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid ${entity} id.`);
  }
}

function requireCartItemId(itemId: number) {
  requireEntityId(itemId, "cart item");
}

export async function getProducts(filters: ProductFilters = {}, signal?: AbortSignal) {
  const response = await apiClient.get<unknown>("/products", { params: filters, signal });
  return normalizeProductPage(response.data, filters.size ?? 12);
}

export async function getAllProducts(
  filters: Omit<ProductFilters, "page" | "size"> = {},
  signal?: AbortSignal,
) {
  const products: Product[] = [];
  let page = 0;
  const size = 100;

  while (true) {
    const result = await getProducts({ ...filters, page, size }, signal);
    products.push(...result.content);

    if (result.last || page + 1 >= result.totalPages || result.content.length === 0) break;
    page += 1;
  }

  return products;
}

export async function getProduct(id: number, signal?: AbortSignal) {
  requireEntityId(id, "product");
  const response = await apiClient.get<unknown>(`/products/${id}`, { signal });
  const product = normalizeProduct(unwrapData(response.data));
  if (product.id <= 0) throw new Error("The backend returned an invalid product.");
  return product;
}

export async function createProduct(payload: ProductPayload) {
  const response = await apiClient.post<unknown>("/products", payload);
  const product = normalizeProduct(unwrapData(response.data));
  if (product.id <= 0) throw new Error("The backend returned an invalid product.");
  return product;
}

export async function updateProduct(id: number, payload: ProductPayload) {
  requireEntityId(id, "product");
  const response = await apiClient.put<unknown>(`/products/${id}`, payload);
  const product = normalizeProduct(unwrapData(response.data));
  if (product.id <= 0) throw new Error("The backend returned an invalid product.");
  return product;
}

export async function deleteProduct(id: number) {
  requireEntityId(id, "product");
  await apiClient.delete(`/products/${id}`);
}

export async function getCategories(signal?: AbortSignal) {
  const response = await apiClient.get<unknown>("/categories", { signal });
  const raw = unwrapData(response.data);
  return arrayValue(raw).map(normalizeCategory).filter((category) => category.id > 0);
}

export async function createCategory(name: string) {
  const response = await apiClient.post<unknown>("/categories", { name });
  const category = normalizeCategory(unwrapData(response.data));
  if (category.id <= 0) throw new Error("The backend returned an invalid category.");
  return category;
}

export async function updateCategory(id: number, name: string) {
  requireEntityId(id, "category");
  const response = await apiClient.put<unknown>(`/categories/${id}`, { name });
  const category = normalizeCategory(unwrapData(response.data));
  if (category.id <= 0) throw new Error("The backend returned an invalid category.");
  return category;
}

export async function deleteCategory(id: number) {
  requireEntityId(id, "category");
  await apiClient.delete(`/categories/${id}`);
}

export async function getCart() {
  const response = await apiClient.get<unknown>("/cart");
  return normalizeCart(response.data);
}

export async function addToCart(productId: number, quantity: number) {
  requireEntityId(productId, "product");
  const response = await apiClient.post<unknown>("/cart/items", { productId, quantity });
  return normalizeCart(response.data);
}

export async function updateCartItem(itemId: number, quantity: number) {
  requireCartItemId(itemId);
  const response = await apiClient.put<unknown>(`/cart/items/${itemId}`, { quantity });
  return response.data ? normalizeCart(response.data) : getCart();
}

export async function removeCartItem(itemId: number) {
  requireCartItemId(itemId);
  const response = await apiClient.delete<unknown>(`/cart/items/${itemId}`);
  return response.data ? normalizeCart(response.data) : getCart();
}

export async function getProductReviews(productId: number, signal?: AbortSignal) {
  requireEntityId(productId, "product");
  const response = await apiClient.get<unknown>(`/products/${productId}/reviews`, { signal });
  return arrayValue(unwrapData(response.data))
    .map(normalizeReview)
    .filter((review) => review.id > 0);
}

export async function getAllReviews(signal?: AbortSignal) {
  const response = await apiClient.get<unknown>("/admin/reviews", { signal });
  return arrayValue(unwrapData(response.data))
    .map(normalizeReview)
    .filter((review) => review.id > 0);
}

export async function getUnreadAdminReviewCount() {
  const response = await apiClient.get<{ unreadCount: number }>("/admin/reviews/unread-count");
  return Number(response.data?.unreadCount ?? 0);
}

export async function getUnreadAdminReviewCountsByProduct() {
  const response = await apiClient.get<Record<string, number>>("/admin/reviews/unread-by-product");
  const result: Record<number, number> = {};
  Object.entries(response.data ?? {}).forEach(([key, value]) => {
    const productId = Number(key);
    const count = Number(value);
    if (Number.isInteger(productId) && productId > 0 && Number.isFinite(count) && count > 0) {
      result[productId] = count;
    }
  });
  return result;
}

export async function markProductReviewsRead(productId: number) {
  requireEntityId(productId, "product");
  const response = await apiClient.put<{ unreadCount: number }>(`/admin/reviews/product/${productId}/read`);
  return Number(response.data?.unreadCount ?? 0);
}

export async function markAllAdminReviewsRead() {
  const response = await apiClient.put<{ unreadCount: number }>("/admin/reviews/read-all");
  return Number(response.data?.unreadCount ?? 0);
}

export async function createReview(productId: number, stars: number, comment: string) {
  requireEntityId(productId, "product");
  const response = await apiClient.post<unknown>(`/products/${productId}/reviews`, { stars, comment });
  const review = normalizeReview(unwrapData(response.data));
  if (review.id <= 0) throw new Error("The backend returned an invalid review.");
  return review;
}

export async function updateReview(reviewId: number, stars: number, comment: string) {
  requireEntityId(reviewId, "review");
  const response = await apiClient.put<unknown>(`/reviews/${reviewId}`, { stars, comment });
  const review = normalizeReview(unwrapData(response.data));
  if (review.id <= 0) throw new Error("The backend returned an invalid review.");
  return review;
}

export async function deleteReview(reviewId: number) {
  requireEntityId(reviewId, "review");
  await apiClient.delete(`/reviews/${reviewId}`);
}

export async function placeOrder(payload?: { addressId: number; shippingMethod?: string; couponCode?: string }) {
  const response = await apiClient.post<unknown>("/orders", payload ?? null);
  const order = normalizeOrder(unwrapData(response.data));
  if (order.id <= 0) throw new Error("The backend returned an invalid order.");
  return order;
}

export async function getOrders(signal?: AbortSignal) {
  const response = await apiClient.get<unknown>("/orders", { signal });
  return arrayValue(unwrapData(response.data)).map(normalizeOrder).filter((order) => order.id > 0);
}

export async function getOrder(id: number, signal?: AbortSignal) {
  requireEntityId(id, "order");
  const response = await apiClient.get<unknown>(`/orders/${id}`, { signal });
  const order = normalizeOrder(unwrapData(response.data));
  if (order.id <= 0) throw new Error("The backend returned an invalid order.");
  return order;
}

export async function getVNPayCheckoutUrl(orderId: number) {
  requireEntityId(orderId, "order");
  const response = await apiClient.post<unknown>(`/payment/vnpay/checkout/${orderId}`);
  const data = record(unwrapData(response.data));
  return text(data.payUrl);
}

export async function confirmVNPayReturn(params: Record<string, string>) {
  const response = await apiClient.post<unknown>("/payment/vnpay/return", params);
  return record(unwrapData(response.data));
}

export async function getAllOrders(signal?: AbortSignal) {
  const response = await apiClient.get<unknown>("/orders/all", { signal });
  return arrayValue(unwrapData(response.data)).map(normalizeOrder).filter((order) => order.id > 0);
}

export async function updateOrderStatus(id: number, status: OrderStatus) {
  requireEntityId(id, "order");
  const response = await apiClient.put<unknown>(`/orders/${id}/status`, { status });
  const order = normalizeOrder(unwrapData(response.data));
  if (order.id <= 0) throw new Error("The backend returned an invalid order.");
  return order;
}

export async function confirmOrderDelivered(id: number) {
  requireEntityId(id, "order");
  const response = await apiClient.put<unknown>(`/orders/${id}/delivered`);
  const order = normalizeOrder(unwrapData(response.data));
  if (order.id <= 0) throw new Error("The backend returned an invalid order.");
  return order;
}

export async function getNotifications(signal?: AbortSignal) {
  const response = await apiClient.get<unknown>("/notifications", { signal });
  return arrayValue(unwrapData(response.data))
    .map(normalizeNotification)
    .filter((notification) => notification.id > 0);
}

export async function getUnreadNotificationCount(signal?: AbortSignal) {
  const response = await apiClient.get<unknown>("/notifications/unread-count", { signal });
  const data = record(unwrapData(response.data));
  return nonNegativeInteger(data.unreadCount);
}

export async function markNotificationRead(id: number) {
  requireEntityId(id, "notification");
  const response = await apiClient.put<unknown>(`/notifications/${id}/read`);
  return normalizeNotification(unwrapData(response.data));
}

export async function markAllNotificationsRead() {
  await apiClient.put("/notifications/read-all");
}
export async function recordSignOutActivity(token: string) {
  if (!token.trim()) return;
  await apiClient.post(
    "/notifications/activity/sign-out",
    {},
    { headers: { Authorization: `Bearer ${token}` } },
  );
}

export async function getProfile() {
  const response = await apiClient.get<User>("/account");
  return response.data;
}

export async function updateProfile(payload: { name: string; email: string; phone?: string; profileImageUrl?: string | null }) {
  const response = await apiClient.put<User>("/account", payload);
  return response.data;
}

export async function uploadProfileImage(file: File) {
  const body = new FormData();
  body.append("file", file);
  const response = await apiClient.post<User>("/account/profile-image", body, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function getAddresses() {
  const response = await apiClient.get<Address[]>("/account/addresses");
  return response.data;
}

export async function createAddress(payload: Omit<Address, "id" | "createdAt">) {
  const response = await apiClient.post<Address>("/account/addresses", payload);
  return response.data;
}

export async function updateAddress(id: number, payload: Omit<Address, "id" | "createdAt">) {
  requireEntityId(id, "address");
  const response = await apiClient.put<Address>(`/account/addresses/${id}`, payload);
  return response.data;
}

export async function deleteAddress(id: number) {
  requireEntityId(id, "address");
  await apiClient.delete(`/account/addresses/${id}`);
}

export async function getWishlist() {
  const response = await apiClient.get<unknown>("/account/wishlist");
  return arrayValue(unwrapData(response.data)).map(normalizeProduct).filter((product) => product.id > 0);
}

export async function getWishlistStatus(productId: number) {
  requireEntityId(productId, "product");
  const response = await apiClient.get<{ wishlisted: boolean }>(`/account/wishlist/${productId}`);
  return response.data.wishlisted === true;
}

export async function addWishlist(productId: number) {
  requireEntityId(productId, "product");
  const response = await apiClient.post<unknown>(`/account/wishlist/${productId}`);
  return normalizeProduct(unwrapData(response.data));
}

export async function removeWishlist(productId: number) {
  requireEntityId(productId, "product");
  await apiClient.delete(`/account/wishlist/${productId}`);
}

export async function getOrderHistory(orderId: number) {
  requireEntityId(orderId, "order");
  const response = await apiClient.get<OrderHistory[]>(`/orders/${orderId}/history`);
  return response.data;
}

export async function shipOrder(orderId: number) {
  requireEntityId(orderId, "order");
  const response = await apiClient.put<unknown>(`/orders/${orderId}/ship`, {});
  return normalizeOrder(unwrapData(response.data));
}

export async function requestOrderReturn(orderId: number, reason: string) {
  requireEntityId(orderId, "order");
  const response = await apiClient.post<unknown>(`/orders/${orderId}/return`, { reason });
  return normalizeOrder(unwrapData(response.data));
}

export async function processOrderReturn(orderId: number, status: OrderStatus) {
  requireEntityId(orderId, "order");
  const response = await apiClient.put<unknown>(`/orders/${orderId}/return-status/${status}`);
  return normalizeOrder(unwrapData(response.data));
}

export async function confirmReturnedItem(orderId: number) {
  requireEntityId(orderId, "order");
  const response = await apiClient.put<unknown>(`/orders/${orderId}/return-item`);
  return normalizeOrder(unwrapData(response.data));
}

export async function confirmRefundReceived(orderId: number) {
  requireEntityId(orderId, "order");
  const response = await apiClient.put<unknown>(`/orders/${orderId}/refund-confirmed`);
  return normalizeOrder(unwrapData(response.data));
}

export async function validateCoupon(code: string) {
  const response = await apiClient.get<Coupon>("/coupons/validate", { params: { code } });
  return response.data;
}

export async function getAvailableCoupons() {
  const response = await apiClient.get<Coupon[]>("/coupons/available");
  return response.data;
}

export async function getAdminDashboard() {
  const response = await apiClient.get<AdminDashboard>("/admin/dashboard");
  return response.data;
}

export async function getCustomers() {
  const response = await apiClient.get<CustomerSummary[]>("/admin/customers");
  return response.data;
}

export async function setCustomerBanned(customerId: number, banned: boolean, reason?: string) {
  requireEntityId(customerId, "customer");
  const response = await apiClient.put<User>(`/admin/customers/${customerId}/ban`, { banned, reason });
  return response.data;
}

export async function getInventoryTransactions() {
  const response = await apiClient.get<InventoryTransaction[]>("/admin/inventory");
  return response.data;
}

export async function adjustInventory(productId: number, quantityChange: number, note?: string) {
  requireEntityId(productId, "product");
  const response = await apiClient.post<InventoryTransaction>(`/admin/inventory/${productId}/adjust`, { quantityChange, note });
  return response.data;
}

export async function getCoupons() {
  const response = await apiClient.get<Coupon[]>("/admin/coupons");
  return response.data;
}

export async function createCoupon(payload: Omit<Coupon, "id" | "usedCount" | "createdAt">) {
  const response = await apiClient.post<Coupon>("/admin/coupons", payload);
  return response.data;
}

export async function updateCoupon(id: number, payload: Omit<Coupon, "id" | "usedCount" | "createdAt">) {
  requireEntityId(id, "coupon");
  const response = await apiClient.put<Coupon>(`/admin/coupons/${id}`, payload);
  return response.data;
}

export async function deleteCoupon(id: number) {
  requireEntityId(id, "coupon");
  await apiClient.delete(`/admin/coupons/${id}`);
}

export async function getAuditLogs() {
  const response = await apiClient.get<AuditLog[]>("/admin/audit");
  return response.data;
}

export async function getSupportTickets(admin = false) {
  const response = await apiClient.get<SupportTicket[]>(admin ? "/support/all" : "/support");
  return response.data;
}

export async function createSupportTicket(payload: { categoryId: number; productId: number; subject: string; message: string }) {
  const response = await apiClient.post<SupportTicket>("/support", payload);
  return response.data;
}

export async function replySupportTicket(id: number, message: string) {
  requireEntityId(id, "support ticket");
  const response = await apiClient.post<SupportTicket>(`/support/${id}/messages`, { message });
  return response.data;
}

export async function closeSupportTicket(id: number) {
  requireEntityId(id, "support ticket");
  const response = await apiClient.put<SupportTicket>(`/support/${id}/close`);
  return response.data;
}

