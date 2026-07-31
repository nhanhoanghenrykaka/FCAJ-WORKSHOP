import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCategories, getProducts } from "../../api/storeApi";
import { Loading } from "../../components/common/Loading";
import { ProductCard } from "../../components/common/ProductCard";
import type { Category, Product } from "../../types";

export function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [productsError, setProductsError] = useState(false);
  const [categoriesError, setCategoriesError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    getProducts({ size: 4, sort: "createdAt,desc" }, controller.signal)
      .then((productPage) => {
        if (!controller.signal.aborted) {
          setProducts(productPage.content);
          setProductsError(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setProducts([]);
          setProductsError(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setProductsLoading(false);
      });

    getCategories(controller.signal)
      .then((categoryList) => {
        if (!controller.signal.aborted) {
          setCategories(categoryList.slice(0, 8));
          setCategoriesError(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setCategories([]);
          setCategoriesError(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setCategoriesLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <main>
      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="section-kicker">Independent electronics catalogue / 2026</p>
          <h1>
            Objects for a more <em>intentional</em> desk.
          </h1>
          <p className="hero-lead">
            A focused selection of audio, input, lighting and studio tools—chosen for how they work, feel and age.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/catalog">
              Browse the catalog <span>↗</span>
            </Link>
            <Link className="text-link" to="/catalog?sort=createdAt,desc">
              See new arrivals →
            </Link>
          </div>
          <dl className="hero-stats">
            <div><dt>01</dt><dd>Small-batch selection</dd></div>
            <div><dt>02</dt><dd>Transparent stock</dd></div>
            <div><dt>03</dt><dd>30-day returns</dd></div>
          </dl>
        </div>
        <div className="home-hero-art" aria-hidden="true">
          <div className="hero-art-label">SHOPSFLOW / ISSUE 04</div>
          <div className="hero-object hero-object-one">⌘</div>
          <div className="hero-object hero-object-two">◉</div>
          <div className="hero-art-note">Useful things.<br />Nothing extra.</div>
        </div>
      </section>

      <section className="announcement-band">
        <span>Free delivery over $80</span>
        <span>●</span>
        <span>Secure checkout</span>
        <span>●</span>
        <span>Independent makers</span>
        <span>●</span>
        <span>Real customer reviews</span>
      </section>

      <section className="store-section">
        <div className="section-heading">
          <div>
            <p className="section-kicker">01 / Browse the shelves</p>
            <h2>Find your category.</h2>
          </div>
          <Link className="text-link" to="/catalog">View everything →</Link>
        </div>
        {categoriesLoading ? (
          <Loading label="Loading categories" />
        ) : categories.length > 0 ? (
          <div className="category-tiles">
            {categories.map((category, index) => (
              <Link
                className="category-tile"
                key={category.id}
                to={`/catalog?categoryId=${category.id}`}
              >
                <span className="category-number">{String(index + 1).padStart(2, "0")}</span>
                <span className="category-symbol">{["⌥", "⌘", "◇", "◐", "◉", "□", "+", "∞"][index % 8]}</span>
                <strong>{category.name}</strong>
                <span className="category-arrow">↗</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="inline-notice">
            {categoriesError ? "Categories are temporarily unavailable." : "No categories have been added yet."}{" "}
            <Link className="text-link" to="/catalog">Browse the full catalog →</Link>
          </div>
        )}
      </section>

      <section className="store-section">
        <div className="section-heading">
          <div>
            <p className="section-kicker">02 / Recently added</p>
            <h2>Fresh on the shelves.</h2>
          </div>
          <Link className="text-link" to="/catalog?sort=createdAt,desc">Shop new →</Link>
        </div>
        {productsLoading ? (
          <Loading label="Loading new products" />
        ) : products.length > 0 ? (
          <div className="product-grid">{products.map((product) => <ProductCard product={product} key={product.id} />)}</div>
        ) : (
          <div className="inline-notice">
            {productsError
              ? "New products could not be loaded. Check that the backend is running."
              : "No products have been added to the catalog yet."}
          </div>
        )}
      </section>

      <section className="editorial-panel">
        <p className="section-kicker">The Shopsflow standard</p>
        <blockquote>“Buy fewer objects. Expect more from every one.”</blockquote>
        <div className="editorial-grid">
          <p>We prioritize repairable products, useful specifications and honest availability.</p>
          <p>No fake urgency. No inflated discount language. Just a clean path from discovery to delivery.</p>
          <Link className="button button-light" to="/catalog">Explore the edit →</Link>
        </div>
      </section>
    </main>
  );
}
