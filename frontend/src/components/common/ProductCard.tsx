import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { addToCart } from "../../api/storeApi";
import { useAuth } from "../../hooks/useAuth";
import { useCart } from "../../hooks/useCart";
import type { Product } from "../../types";
import { formatCurrency } from "../../utils/format";
import { ProductVisual } from "./ProductVisual";

const LOW_STOCK_THRESHOLD = 5;
const NEW_PRODUCT_DAYS = 30;

export function ProductCard({ product }: { product: Product }) {
  const categories = Array.isArray(product.categories) ? product.categories : [];
  const productName = typeof product.name === "string" && product.name.trim()
    ? product.name
    : "Unnamed product";
  const productId = Number.isInteger(product.id) && product.id > 0 ? product.id : 0;
  const productPath = productId > 0 ? `/products/${productId}` : "/catalog";
  const stockQuantity = Number.isFinite(product.stockQuantity)
    ? Math.max(0, Math.trunc(product.stockQuantity))
    : 0;
  const { isLoggedIn, user } = useAuth();
  const { setCart } = useCart();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const createdAt = Date.parse(product.createdAt);
  const isNew = Number.isFinite(createdAt) && Date.now() - createdAt <= NEW_PRODUCT_DAYS * 24 * 60 * 60 * 1000;

  async function quickAdd() {
    if (productId <= 0 || stockQuantity <= 0 || adding) return;
    if (!isLoggedIn) {
      navigate("/login", { state: { from: { pathname: productPath } } });
      return;
    }
    if (user?.role === "ADMIN") {
      navigate("/admin");
      return;
    }

    setAdding(true);
    try {
      setCart(await addToCart(productId, 1));
      toast.success(`${productName} added to cart.`);
    } catch {
      toast.error("Could not add this product to the cart.");
    } finally {
      setAdding(false);
    }
  }

  const stockText = stockQuantity === 0
    ? "Sold out"
    : stockQuantity <= LOW_STOCK_THRESHOLD
      ? `Only ${stockQuantity} left`
      : `${stockQuantity} in stock`;

  return (
    <article className="catalog-card">
      <Link to={productPath} className="catalog-card-media">
        <ProductVisual imageUrl={product.imageUrl} name={productName} />
        <div className="catalog-card-badges">
          {isNew && <span className="new-chip">New</span>}
          <span className={`stock-chip ${stockQuantity === 0 ? "is-out" : stockQuantity <= LOW_STOCK_THRESHOLD ? "is-low" : ""}`}>
            {stockText}
          </span>
        </div>
      </Link>
      <div className="catalog-card-body">
        <p className="catalog-card-kicker">
          {categories.map((category) => category?.name).filter(Boolean).join(" · ") || "Uncategorized"}
        </p>
        <div className="catalog-card-title-row">
          <Link to={productPath}>{productName}</Link>
          <strong>{formatCurrency(product.price)}</strong>
        </div>
        <button
          type="button"
          className="catalog-quick-add"
          disabled={stockQuantity === 0 || adding}
          onClick={() => void quickAdd()}
        >
          {stockQuantity === 0 ? "Sold out" : adding ? "Adding…" : "Quick add"}
          {stockQuantity > 0 && !adding && <span>+</span>}
        </button>
      </div>
    </article>
  );
}
