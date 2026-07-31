import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useCart } from "../hooks/useCart";
import { getUnreadNotificationCount, recordSignOutActivity } from "../api/storeApi";
import { initials } from "../utils/format";
import { Logo } from "./common/Logo";
import "./Header.css";

function Header() {
  const { token, user, isLoggedIn, logoutUser } = useAuth();
  const { cart } = useCart();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", closeMenu);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !user) {
      setUnreadNotifications(0);
      return;
    }

    let active = true;
    async function refreshUnreadCount() {
      try {
        const count = await getUnreadNotificationCount();
        if (active) setUnreadNotifications(count);
      } catch {
        // The global API interceptor handles expired sessions. A notification
        // badge should never block the rest of the header.
      }
    }

    void refreshUnreadCount();
    const intervalId = window.setInterval(() => void refreshUnreadCount(), 3000);
    const handleUpdate = () => void refreshUnreadCount();
    const handleFocus = () => void refreshUnreadCount();

    window.addEventListener("shopsflow:notifications-updated", handleUpdate);
    window.addEventListener("focus", handleFocus);
    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("shopsflow:notifications-updated", handleUpdate);
      window.removeEventListener("focus", handleFocus);
    };
  }, [isLoggedIn, user?.id]);

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const keyword = query.trim();
    navigate(keyword ? `/catalog?keyword=${encodeURIComponent(keyword)}` : "/catalog");
    setMobileOpen(false);
  }

  function handleLogout() {
    if (token) {
      // Record the activity without delaying sign-out. The explicit token keeps
      // this request authenticated even after local auth storage is cleared.
      void recordSignOutActivity(token).catch(() => undefined);
    }
    logoutUser();
    setMenuOpen(false);
    setMobileOpen(false);
    navigate("/login", { replace: true });
  }

  return (
    <header className={`site-header ${isAdmin ? "admin-header" : ""}`}>
      <div className="site-header-inner">
        <Logo to={isAdmin ? "/admin" : "/"} />

        <button
          className="mobile-nav-toggle"
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
        >
          <span />
          <span />
        </button>

        <div className={`header-content ${mobileOpen ? "is-open" : ""}`}>
          <nav className="primary-nav" aria-label="Primary navigation">
            {isAdmin ? (
              <>
                <NavLink
                  to="/admin"
                  end
                  className={({ isActive }) => isActive ? "admin-nav-active" : undefined}
                  onClick={() => setMobileOpen(false)}
                >
                  Run the shop
                </NavLink>
                <NavLink
                  to="/admin/operations"
                  className={({ isActive }) => isActive ? "admin-nav-active" : undefined}
                  onClick={() => setMobileOpen(false)}
                >
                  Operations
                </NavLink>
              </>
            ) : (
              <>
                <NavLink to="/" end onClick={() => setMobileOpen(false)}>
                  Home
                </NavLink>
                <NavLink to="/catalog" onClick={() => setMobileOpen(false)}>
                  Catalog
                </NavLink>
                {isLoggedIn && (
                  <NavLink to="/orders" onClick={() => setMobileOpen(false)}>
                    Orders
                  </NavLink>
                )}
              </>
            )}
          </nav>

          <div className="header-actions">
            {isLoggedIn && (
              <Link
                className="header-icon-button notification-button"
                to="/notifications"
                aria-label={unreadNotifications > 0
                  ? `Notifications, ${unreadNotifications} unread`
                  : "Notifications"}
                onClick={() => setMobileOpen(false)}
              >
                <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M4.5 8.25C4.5 5.05 6.42 3 10 3s5.5 2.05 5.5 5.25v3.1l1.35 2.15H3.15l1.35-2.15v-3.1Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                  <path d="M8 15.5c.35.9 1.02 1.35 2 1.35s1.65-.45 2-1.35" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                {unreadNotifications > 0 && (
                  <span className="notification-bell-count">
                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                  </span>
                )}
              </Link>
            )}

            {!isAdmin && (
              <>
                <form className="header-search" onSubmit={handleSearch} role="search">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <circle cx="7" cy="7" r="4.75" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search the catalog"
                    aria-label="Search products"
                  />
                </form>

                <Link className="header-icon-button" to="/cart" aria-label="Shopping cart">
                  <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M2.5 3.5H5L6.4 13H15.5L17 6H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="7.5" cy="16.5" r="1" fill="currentColor" />
                    <circle cx="14.5" cy="16.5" r="1" fill="currentColor" />
                  </svg>
                  {cart.totalItems > 0 && <span className="cart-count">{cart.totalItems}</span>}
                </Link>
              </>
            )}

            {isLoggedIn && user ? (
              <div className="account-dropdown" ref={menuRef}>
                <button
                  className="account-trigger"
                  type="button"
                  aria-label="Open account menu"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((open) => !open)}
                >
                  {user.profileImageUrl ? <img className="account-trigger-image" src={user.profileImageUrl} alt="" /> : (initials(user.name) || "U")}
                </button>
                {menuOpen && (
                  <div className="account-popover">
                    <div className="account-summary">
                      <strong>{user.name}</strong>
                      <span>{user.email}</span>
                      <small>{user.role}</small>
                    </div>
                    {isAdmin ? (
                      <>
                        <Link to="/admin" onClick={() => setMenuOpen(false)}>Admin workspace</Link>
                        <Link to="/admin/operations" onClick={() => setMenuOpen(false)}>Operations & reports</Link>
                        <Link to="/admin/profile" onClick={() => setMenuOpen(false)}>Admin profile</Link>
                      </>
                    ) : (
                      <>
                        <Link to="/account" onClick={() => setMenuOpen(false)}>My account</Link>
                        <Link to="/orders" onClick={() => setMenuOpen(false)}>My orders</Link>
                        <Link to="/support" onClick={() => setMenuOpen(false)}>Support</Link>
                        <Link to="/cart" onClick={() => setMenuOpen(false)}>Shopping cart</Link>
                      </>
                    )}
                    <button type="button" onClick={handleLogout}>
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link className="sign-in-link" to="/login" onClick={() => setMobileOpen(false)}>
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
