export type Role = "ADMIN" | "USER";

export type User = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  profileImageUrl?: string | null;
  banned?: boolean;
  role: Role;
};

export type NotificationType =
  | "ACCOUNT" | "CART" | "ORDER" | "PAYMENT" | "REVIEW" | "PRODUCT" | "CATEGORY"
  | "WISHLIST" | "INVENTORY" | "PROMOTION" | "SUPPORT" | "RETURN" | "SYSTEM";

export type AppNotification = {
  id: number;
  actorUserId: number | null;
  actorName: string | null;
  actorRole: Role | null;
  type: NotificationType;
  title: string;
  message: string;
  targetUrl: string | null;
  read: boolean;
  createdAt: string;
};

export type Category = { id: number; name: string };

export type Product = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  stockQuantity: number;
  createdAt: string;
  categories: Category[];
};

export type PageResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
};

export type CartItem = {
  itemId: number | null;
  productId: number;
  productName: string;
  imageUrl: string | null;
  stockQuantity: number | null;
  unitPrice: number;
  quantity: number;
  subtotal: number;
};

export type Cart = { items: CartItem[]; totalItems: number; totalPrice: number };

export type Review = {
  id: number;
  stars: number;
  comment: string | null;
  createdAt: string;
  userId: number;
  userName: string;
  productId: number | null;
  productName: string | null;
  verifiedPurchase: boolean;
};

export type OrderStatus =
  | "PENDING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED"
  | "RETURN_REQUESTED" | "RETURN_APPROVED" | "RETURN_REJECTED" | "RETURNED"
  | "RETURN_RECEIVED" | "REFUNDED" | "REFUND_CONFIRMED";

export type OrderItem = {
  productId: number;
  productName: string;
  quantity: number;
  priceAtPurchase: number;
  subtotal: number;
};

export type Order = {
  id: number;
  status: OrderStatus;
  totalAmount: number;
  shippingFee: number;
  discountAmount: number;
  shippingMethod: string;
  shippingAddress: string | null;
  receiverName: string | null;
  receiverPhone: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  couponCode: string | null;
  returnReason: string | null;
  totalItems: number;
  createdAt: string;
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
  vnpayTransId: string | null;
  items: OrderItem[];
};

export type Address = {
  id: number;
  receiverName: string;
  phone: string;
  line1: string;
  ward: string | null;
  district: string | null;
  province: string;
  defaultAddress: boolean;
  createdAt: string;
};

export type OrderHistory = {
  id: number;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  changedByName: string | null;
  note: string | null;
  createdAt: string;
};

export type CustomerSummary = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  profileImageUrl: string | null;
  banned: boolean;
  bannedReason: string | null;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
  reviewCount: number;
};

export type InventoryTransaction = {
  id: number;
  productId: number;
  productName: string;
  quantityChange: number;
  type: string;
  referenceId: number | null;
  actorName: string | null;
  note: string | null;
  createdAt: string;
};

export type Coupon = {
  id: number;
  code: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  minimumOrder: number;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  perCustomerUsageLimit: number | null;
  usedCount: number;
  audienceAll: boolean;
  customerIds: number[];
  createdAt: string;
};

export type SupportMessage = {
  id: number;
  senderId: number;
  senderName: string;
  senderRole: Role;
  message: string;
  createdAt: string;
};

export type SupportTicket = {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  orderId: number | null;
  categoryId: number | null;
  categoryName: string | null;
  productId: number | null;
  productName: string | null;
  subject: string;
  status: "OPEN" | "ANSWERED" | "CLOSED";
  createdAt: string;
  updatedAt: string;
  messages: SupportMessage[];
};

export type AuditLog = {
  id: number;
  actorUserId: number | null;
  actorName: string;
  actorRole: Role | null;
  action: string;
  entityType: string | null;
  entityId: number | null;
  details: string | null;
  createdAt: string;
};

export type AdminDashboard = {
  revenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  averageRating: number;
  ordersByStatus: Record<string, number>;
  topProducts: { productId: number; productName: string; unitsSold: number; revenue: number }[];
};

export type ApiError = { status?: number; message?: string; fieldErrors?: Record<string, string> | null };
