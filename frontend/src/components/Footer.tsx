import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Logo } from "./common/Logo";
import "./Footer.css";

type FooterProps = {
  compact?: boolean;
};

function Footer({ compact = false }: FooterProps) {
  const { isLoggedIn, logoutUser } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logoutUser();
    navigate("/login", { replace: true });
  }

  return (
    <footer className={`site-footer${compact ? " site-footer-compact" : ""}`}>
      {!compact && (
        <div className="site-footer-grid">
          <div className="footer-brand">
            <Logo />
            <p>Considered electronics for focused work, quiet listening and better everyday rituals.</p>
          </div>
          <div>
            <h3>Shop</h3>
            <Link to="/catalog">All products</Link>
            <Link to="/catalog?sort=createdAt,desc">New arrivals</Link>
            <Link to="/cart">Cart</Link>
          </div>
          <div>
            <h3>Account</h3>
            {isLoggedIn ? (
              <>
                <button className="footer-link-button" type="button" onClick={handleLogout}>
                  Sign out
                </button>
                <Link to="/orders">Orders</Link>
                <Link to="/account">Account</Link>
                <Link to="/support">Support</Link>
              </>
            ) : (
              <>
                <Link to="/login">Sign in</Link>
                <Link to="/register">Create account</Link>
              </>
            )}
          </div>
          <div>
            <h3>Studio</h3>
            {isLoggedIn ? <Link to="/support">Contact support</Link> : <a href="mailto:hello@shopsflow.local">Contact</a>}
            <span>Saigon, Vietnam</span>
            <span>Open source storefront</span>
          </div>
        </div>
      )}
      <div className="site-footer-bottom">
        <span>© 2026 Shopsflow Studio</span>
        <span>Built with React + Spring Boot</span>
      </div>
    </footer>
  );
}

export default Footer;
