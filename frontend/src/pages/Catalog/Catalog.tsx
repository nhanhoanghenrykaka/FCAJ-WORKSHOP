import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getApiErrorMessage } from "../../api/client";
import { getCategories, getProducts } from "../../api/storeApi";
import { EmptyState } from "../../components/common/EmptyState";
import { Loading } from "../../components/common/Loading";
import { ProductCard } from "../../components/common/ProductCard";
import type { Category, PageResponse, Product } from "../../types";

const emptyPage: PageResponse<Product> = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  size: 12,
  number: 0,
  first: true,
  last: true,
  empty: true,
};

function optionalNumber(value: string | null) {
  if (value === null || value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function pageNumber(value: string | null) {
  const parsed = optionalNumber(value);
  return parsed !== undefined && Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [pageData, setPageData] = useState<PageResponse<Product>>(emptyPage);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [keywordInput, setKeywordInput] = useState(searchParams.get("keyword") || "");
  const [minPriceInput, setMinPriceInput] = useState(searchParams.get("minPrice") || "");
  const [maxPriceInput, setMaxPriceInput] = useState(searchParams.get("maxPrice") || "");
  const [priceError, setPriceError] = useState("");

  const filters = useMemo(() => ({
    keyword: searchParams.get("keyword") || undefined,
    categoryId: optionalNumber(searchParams.get("categoryId")),
    minPrice: optionalNumber(searchParams.get("minPrice")),
    maxPrice: optionalNumber(searchParams.get("maxPrice")),
    page: pageNumber(searchParams.get("page")),
    size: 12,
    sort: searchParams.get("sort") || "createdAt,desc",
  }), [searchParams]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setKeywordInput(searchParams.get("keyword") || "");
      setMinPriceInput(searchParams.get("minPrice") || "");
      setMaxPriceInput(searchParams.get("maxPrice") || "");
      setPriceError("");
    });
    return () => { cancelled = true; };
  }, [searchParams]);

  useEffect(() => {
    const controller = new AbortController();
    getCategories(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setCategories(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!controller.signal.aborted) setCategories([]);
      });
    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setLoading(true);
        setError("");
      }
    });

    getProducts(filters, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setPageData(data);
      })
      .catch((requestError) => {
        if (controller.signal.aborted) return;
        setPageData(emptyPage);
        setError(getApiErrorMessage(requestError, "Could not load the catalog. Check that the backend is running."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [filters]);

  function patchParams(values: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams);
    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined && value !== "") next.set(key, value);
      else next.delete(key);
    });
    if (!("page" in values)) next.delete("page");
    setSearchParams(next);
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    patchParams({ keyword: keywordInput.trim() || undefined });
  }

  function submitPrice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const minPrice = optionalNumber(minPriceInput);
    const maxPrice = optionalNumber(maxPriceInput);

    if ((minPriceInput && minPrice === undefined) || (maxPriceInput && maxPrice === undefined)) {
      setPriceError("Enter valid numeric prices.");
      return;
    }
    if ((minPrice !== undefined && minPrice < 0) || (maxPrice !== undefined && maxPrice < 0)) {
      setPriceError("Prices cannot be negative.");
      return;
    }
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      setPriceError("Minimum price cannot be greater than maximum price.");
      return;
    }

    setPriceError("");
    patchParams({
      minPrice: minPriceInput.trim() || undefined,
      maxPrice: maxPriceInput.trim() || undefined,
    });
  }

  function clearFilters() {
    setKeywordInput("");
    setMinPriceInput("");
    setMaxPriceInput("");
    setPriceError("");
    setSearchParams(new URLSearchParams());
  }

  return (
    <main className="page-shell">
      <header className="page-heading catalog-heading">
        <div>
          <p className="section-kicker">Catalog / {pageData.totalElements} objects</p>
          <h1>Everything, considered.</h1>
        </div>
        <p>Search by name, narrow by category and price, then order the collection your way.</p>
      </header>

      <div className="catalog-layout">
        <aside className="filter-panel">
          <form onSubmit={submitSearch}>
            <label className="form-field">
              <span>Search</span>
              <input value={keywordInput} onChange={(event) => setKeywordInput(event.target.value)} placeholder="Product name" />
            </label>
            <button className="button button-primary button-full" type="submit">Apply search</button>
          </form>

          <div className="filter-group">
            <span className="filter-label">Category</span>
            <button type="button" className={!filters.categoryId ? "is-active" : ""} onClick={() => patchParams({ categoryId: undefined })}>All categories</button>
            {categories.map((category) => (
              <button
                type="button"
                key={category.id}
                className={filters.categoryId === category.id ? "is-active" : ""}
                onClick={() => patchParams({ categoryId: String(category.id) })}
              >
                {category.name}
              </button>
            ))}
          </div>

          <form className="filter-group" onSubmit={submitPrice}>
            <span className="filter-label">Price</span>
            <div className="price-fields">
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Min"
                value={minPriceInput}
                onChange={(event) => setMinPriceInput(event.target.value)}
                aria-label="Minimum price"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Max"
                value={maxPriceInput}
                onChange={(event) => setMaxPriceInput(event.target.value)}
                aria-label="Maximum price"
              />
            </div>
            {priceError && <p className="filter-error">{priceError}</p>}
            <button className="button button-secondary button-full" type="submit">Apply price</button>
          </form>

          <button className="text-button" type="button" onClick={clearFilters}>Clear all filters</button>
        </aside>

        <section className="catalog-results">
          <div className="catalog-toolbar">
            <span>{pageData.totalElements} results</span>
            <label>
              <span>Sort</span>
              <select value={filters.sort} onChange={(event) => patchParams({ sort: event.target.value })}>
                <option value="createdAt,desc">Newest first</option>
                <option value="price,asc">Price: low to high</option>
                <option value="price,desc">Price: high to low</option>
                <option value="name,asc">Name: A–Z</option>
              </select>
            </label>
          </div>

          {loading ? <Loading label="Loading catalog" /> : error ? (
            <EmptyState title="Catalog unavailable" description={error} />
          ) : pageData.content.length === 0 ? (
            <EmptyState title="No products found" description="Try removing a filter or searching with a different term." action={<button className="button button-secondary" onClick={clearFilters}>Reset filters</button>} />
          ) : (
            <>
              <div className="product-grid">{pageData.content.map((product) => <ProductCard key={product.id} product={product} />)}</div>
              {pageData.totalPages > 1 && (
                <nav className="pagination" aria-label="Catalog pages">
                  <button type="button" disabled={pageData.first} onClick={() => patchParams({ page: String(Math.max(0, pageData.number - 1)) })}>← Previous</button>
                  <span>Page {pageData.number + 1} of {pageData.totalPages}</span>
                  <button type="button" disabled={pageData.last} onClick={() => patchParams({ page: String(pageData.number + 1) })}>Next →</button>
                </nav>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
