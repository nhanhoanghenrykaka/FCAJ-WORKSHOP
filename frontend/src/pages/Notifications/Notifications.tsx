import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../api/storeApi";
import { getApiErrorMessage } from "../../api/client";
import { Pagination } from "../../components/common/Pagination";
import { usePagination } from "../../hooks/usePagination";
import { useAuth } from "../../hooks/useAuth";
import type { AppNotification, Role } from "../../types";
import "./Notifications.css";

type ReadFilter = "ALL" | "UNREAD";
type ActorFilter = "ALL" | Role | "SYSTEM";

const typeLabel: Record<AppNotification["type"], string> = {
  ACCOUNT: "Account",
  CART: "Cart",
  ORDER: "Order",
  PAYMENT: "Payment",
  REVIEW: "Review",
  PRODUCT: "Product",
  CATEGORY: "Category",
  WISHLIST: "Wishlist",
  INVENTORY: "Inventory",
  PROMOTION: "Promotion",
  SUPPORT: "Support",
  RETURN: "Return",
  SYSTEM: "System",
};

function actorKey(notification: AppNotification): ActorFilter {
  return notification.actorRole ?? "SYSTEM";
}

function actorLabel(notification: AppNotification) {
  const name = notification.actorName?.trim();
  if (notification.actorRole === "ADMIN") return name ? `Admin · ${name}` : "Admin";
  if (notification.actorRole === "USER") return name ? `Customer · ${name}` : "Customer";
  return name || "System";
}

function formatDate(value: string) {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readFilter, setReadFilter] = useState<ReadFilter>("ALL");
  const [actorFilter, setActorFilter] = useState<ActorFilter>("ALL");
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    let active = true;
    let firstLoad = true;

    async function load() {
      try {
        if (firstLoad) setLoading(true);
        const next = await getNotifications();
        if (active) setNotifications(next);
      } catch (error) {
        if (active && firstLoad) {
          toast.error(getApiErrorMessage(error, "Could not load notifications."));
        }
      } finally {
        if (active && firstLoad) {
          setLoading(false);
          firstLoad = false;
        }
      }
    }

    void load();
    const intervalId = window.setInterval(() => void load(), 3000);
    const handleUpdate = () => void load();
    const handleFocus = () => void load();
    window.addEventListener("shopsflow:notifications-updated", handleUpdate);
    window.addEventListener("focus", handleFocus);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("shopsflow:notifications-updated", handleUpdate);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );

  const actorFilters = useMemo<ActorFilter[]>(
    () => user?.role === "ADMIN"
      ? ["ALL", "USER", "SYSTEM"]
      : ["ALL", "ADMIN", "SYSTEM"],
    [user?.role],
  );

  const visibleNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      const matchesRead = readFilter === "ALL" || !notification.read;
      const matchesActor = actorFilter === "ALL" || actorKey(notification) === actorFilter;
      return matchesRead && matchesActor;
    });
  }, [actorFilter, notifications, readFilter]);

  const notificationPager = usePagination(visibleNotifications, 12);

  useEffect(() => {
    notificationPager.setPage(1);
  }, [readFilter, actorFilter]);

  async function markOneRead(notification: AppNotification) {
    if (notification.read) return;
    setNotifications((current) =>
      current.map((item) => item.id === notification.id ? { ...item, read: true } : item),
    );
    try {
      await markNotificationRead(notification.id);
    } catch (error) {
      setNotifications((current) =>
        current.map((item) => item.id === notification.id ? { ...item, read: false } : item),
      );
      toast.error(getApiErrorMessage(error, "Could not mark notification as read."));
    }
  }

  async function handleMarkAllRead() {
    if (unreadCount === 0 || markingAll) return;
    try {
      setMarkingAll(true);
      await markAllNotificationsRead();
      setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not mark all notifications as read."));
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <main className="section notifications-page">
      <div className="container notifications-shell">
        <div className="notifications-heading">
          <div>
            <span className="eyebrow">{user?.role === "ADMIN" ? "Admin activity center" : "Customer activity center"}</span>
            <h1 className="h-1">Notifications</h1>
            <p>
              {user?.role === "ADMIN"
                ? "Customer and system events that affect the admin workspace appear here."
                : "Admin and system events that affect your shopping experience appear here."}
            </p>
          </div>
          <div className="notification-summary-card" aria-label={`${unreadCount} unread notifications`}>
            <span>Unread</span>
            <strong>{unreadCount}</strong>
          </div>
        </div>

        <div className="notification-toolbar">
          <div className="notification-filter-group" aria-label="Read status filter">
            <button
              type="button"
              className={readFilter === "ALL" ? "is-active" : ""}
              onClick={() => setReadFilter("ALL")}
            >
              All
            </button>
            <button
              type="button"
              className={readFilter === "UNREAD" ? "is-active" : ""}
              onClick={() => setReadFilter("UNREAD")}
            >
              Unread {unreadCount > 0 ? `(${unreadCount})` : ""}
            </button>
          </div>

          <div className="notification-filter-group actor-filter" aria-label="Activity source filter">
            {actorFilters.map((filter) => (
              <button
                type="button"
                key={filter}
                className={actorFilter === filter ? "is-active" : ""}
                onClick={() => setActorFilter(filter)}
              >
                {filter === "USER" ? "Customer" : filter.charAt(0) + filter.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <button
            className="mark-all-button"
            type="button"
            disabled={unreadCount === 0 || markingAll}
            onClick={handleMarkAllRead}
          >
            {markingAll ? "Marking..." : "Mark all as read"}
          </button>
        </div>

        {loading ? (
          <div className="notification-empty">Loading activity...</div>
        ) : visibleNotifications.length === 0 ? (
          <div className="notification-empty">
            <strong>No notifications here.</strong>
            <span>
              {user?.role === "ADMIN"
                ? "Relevant customer and system activity will appear automatically."
                : "Relevant admin and system activity will appear automatically."}
            </span>
          </div>
        ) : (
          <div className="notification-list">
            {notificationPager.pageItems.map((notification) => {
              const content = (
                <>
                  <div className={`notification-type-mark type-${notification.type.toLowerCase()}`} aria-hidden="true">
                    {typeLabel[notification.type].charAt(0)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-meta">
                      <span className={`actor-badge actor-${actorKey(notification).toLowerCase()}`}>
                        {actorLabel(notification)}
                      </span>
                      <span>{typeLabel[notification.type]}</span>
                      <span>{formatDate(notification.createdAt)}</span>
                    </div>
                    <div className="notification-title-row">
                      <strong>{notification.title}</strong>
                      {!notification.read && <span className="unread-dot" aria-label="Unread" />}
                    </div>
                    <p>{notification.message}</p>
                  </div>
                  <span className="notification-arrow" aria-hidden="true">→</span>
                </>
              );

              if (notification.targetUrl) {
                return (
                  <Link
                    key={notification.id}
                    className={`notification-item ${notification.read ? "is-read" : "is-unread"}`}
                    to={notification.targetUrl}
                    onClick={() => void markOneRead(notification)}
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <button
                  key={notification.id}
                  type="button"
                  className={`notification-item ${notification.read ? "is-read" : "is-unread"}`}
                  onClick={() => void markOneRead(notification)}
                >
                  {content}
                </button>
              );
            })}
          </div>
        )}
        {!loading && visibleNotifications.length > 0 && (
          <Pagination page={notificationPager.page} totalPages={notificationPager.totalPages} onPageChange={notificationPager.setPage} />
        )}
      </div>
    </main>
  );
}
