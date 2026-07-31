import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "../../api/client";
import {
  addToCart,
  addWishlist,
  getProduct,
  getProductReviews,
  getWishlistStatus,
  removeWishlist,
} from "../../api/storeApi";
import { EmptyState } from "../../components/common/EmptyState";
import { Loading } from "../../components/common/Loading";
import { Pagination } from "../../components/common/Pagination";
import { ProductVisual } from "../../components/common/ProductVisual";
import { useAuth } from "../../hooks/useAuth";
import { usePagination } from "../../hooks/usePagination";
import { useCart } from "../../hooks/useCart";
import type { Product, Review } from "../../types";
import { formatCurrency, formatDate } from "../../utils/format";

export default function ProductDetail() {
  const { id } = useParams();
  const location = useLocation();
  const productId = Number(id);
  const hasValidProductId = Number.isInteger(productId) && productId > 0;
  const [product, setProduct] = useState<Product | null>(null);
  const [loadedProductId, setLoadedProductId] = useState<number | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const reviewPager = usePagination(reviews, 8);
  const [loading, setLoading] = useState(hasValidProductId);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const { isLoggedIn } = useAuth();
  const { setCart } = useCart();
  const navigate = useNavigate();

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((sum, review) => sum + review.stars, 0) / reviews.length;
  }, [reviews]);

  useEffect(() => {
    const controller = new AbortController();

    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      setProduct(null);
      setLoadedProductId(null);
      setReviews([]);
      setLoading(hasValidProductId);
      setQuantity(1);
      setAdding(false);
    });

    if (!hasValidProductId) {
      return () => {
        controller.abort();
      };
    }

    Promise.all([
      getProduct(productId, controller.signal),
      getProductReviews(productId, controller.signal),
    ])
      .then(([productData, reviewData]) => {
        if (controller.signal.aborted) return;
        setProduct(productData);
        setLoadedProductId(productId);
        setReviews(Array.isArray(reviewData) ? reviewData : []);
        setQuantity(productData.stockQuantity > 0 ? 1 : 0);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setProduct(null);
          setLoadedProductId(null);
          setReviews([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [hasValidProductId, productId]);

  useEffect(() => {
    let active = true;

    if (!hasValidProductId || !isLoggedIn) {
      setWishlisted(false);
      return () => {
        active = false;
      };
    }

    getWishlistStatus(productId)
      .then((status) => {
        if (active) setWishlisted(status);
      })
      .catch(() => {
        if (active) setWishlisted(false);
      });

    return () => {
      active = false;
    };
  }, [hasValidProductId, isLoggedIn, productId]);

  useEffect(() => {
    if (loading || loadedProductId !== productId || location.hash !== "#reviews") return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("reviews")?.scrollIntoView({ block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loadedProductId, loading, location.hash, productId, reviews.length]);

  async function handleAddToCart() {
    if (!product || product.stockQuantity <= 0) return;
    if (!isLoggedIn) {
      navigate("/login", { state: { from: location } });
      return;
    }

    const safeQuantity = Math.min(Math.max(1, quantity), product.stockQuantity);
    setAdding(true);
    try {
      const cart = await addToCart(product.id, safeQuantity);
      setCart(cart);
      toast.success(`${product.name} added to your cart.`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not add this product."));
    } finally {
      setAdding(false);
    }
  }

  async function toggleWishlist() {
    if (!product) return;
    if (!isLoggedIn) {
      navigate("/login", { state: { from: location } });
      return;
    }
    try {
      if (wishlisted) {
        await removeWishlist(product.id);
        setWishlisted(false);
        toast.success("Removed from wishlist.");
      } else {
        await addWishlist(product.id);
        setWishlisted(true);
        toast.success("Saved to wishlist.");
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not update wishlist."));
    }
  }

  if (!hasValidProductId) {
    return (
      <main className="page-shell">
        <EmptyState
          title="Product not found"
          description="This object may have been removed or the link is incorrect."
          action={<Link className="button button-primary" to="/catalog">Back to catalog</Link>}
        />
      </main>
    );
  }

  if (loading || loadedProductId !== productId) {
    return <main className="page-shell"><Loading label="Loading product" /></main>;
  }

  if (!product) {
    return (
      <main className="page-shell">
        <EmptyState
          title="Product not found"
          description="This object may have been removed or the link is incorrect."
          action={<Link className="button button-primary" to="/catalog">Back to catalog</Link>}
        />
      </main>
    );
  }

  const maxSelectableQuantity = Math.max(product.stockQuantity, 0);

  return (
    <main className="page-shell">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/catalog">Catalog</Link><span>/</span><span>{product.name}</span>
      </nav>

      <section className="product-detail-grid">
        <div className="product-detail-media"><ProductVisual imageUrl={product.imageUrl} name={product.name} /></div>
        <div className="product-detail-copy">
          <p className="section-kicker">{product.categories.map((category) => category.name).join(" / ") || "Uncategorized"}</p>
          <h1>{product.name}</h1>
          <div className="product-rating-row">
            <span className="star-line">{"★".repeat(Math.round(averageRating))}{"☆".repeat(5 - Math.round(averageRating))}</span>
            <a href="#reviews">{reviews.length ? `${averageRating.toFixed(1)} from ${reviews.length} review${reviews.length === 1 ? "" : "s"}` : "No reviews yet"}</a>
          </div>
          <strong className="product-price">{formatCurrency(product.price)}</strong>
          <p className="product-description">{product.description || "A considered object from the Shopsflow catalog. Full specifications will be added shortly."}</p>

          <div className="stock-line">
            <span className={product.stockQuantity > 0 ? "stock-dot" : "stock-dot is-out"} />
            {product.stockQuantity > 0 ? `${product.stockQuantity} available and ready to ship` : "Currently out of stock"}
          </div>

          <div className="purchase-row">
            <label className="quantity-field">
              <span>Quantity</span>
              <select value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} disabled={product.stockQuantity === 0}>
                {Array.from({ length: maxSelectableQuantity }, (_, index) => index + 1).map((value) => <option value={value} key={value}>{value}</option>)}
              </select>
            </label>
            <button className="button button-primary purchase-button" type="button" onClick={handleAddToCart} disabled={adding || product.stockQuantity === 0}>
              {adding ? "Adding…" : product.stockQuantity === 0 ? "Sold out" : "Add to cart"}
            </button>
          </div>
          <button className="text-button wishlist-action" type="button" onClick={() => void toggleWishlist()}>
            {wishlisted ? "♥ Saved to wishlist" : "♡ Add to wishlist"}
          </button>

          <dl className="product-service-list">
            <div><dt>Delivery</dt><dd>Free over $80. Calculated at checkout.</dd></div>
            <div><dt>Returns</dt><dd>30 days, with original packaging.</dd></div>
            <div><dt>Support</dt><dd>Human help for every order.</dd></div>
          </dl>
        </div>
      </section>

      <section className="reviews-section" id="reviews">
        <div className="section-heading">
          <div><p className="section-kicker">Customer notes</p><h2>Reviews ({reviews.length})</h2></div>
          {reviews.length > 0 && <div className="rating-summary"><strong>{averageRating.toFixed(1)}</strong><span>{"★".repeat(Math.round(averageRating))}{"☆".repeat(5 - Math.round(averageRating))}</span></div>}
        </div>

        <div className="review-list">
          {reviews.length === 0 ? <div className="inline-notice">No review has been published yet.</div> : reviewPager.pageItems.map((review) => (
            <article className="review-card" key={review.id}>
              <div className="review-card-head">
                <div><strong>{review.userName || "Customer"} {review.verifiedPurchase && <small className="verified-purchase">✓ Verified purchase</small>}</strong><span>{formatDate(review.createdAt)}</span></div>
                <span className="star-line">{"★".repeat(review.stars)}{"☆".repeat(5 - review.stars)}</span>
              </div>
              <p>{review.comment || "No written comment."}</p>
            </article>
          ))}
        </div>
        <Pagination page={reviewPager.page} totalPages={reviewPager.totalPages} onPageChange={reviewPager.setPage} />
      </section>
    </main>
  );
}
