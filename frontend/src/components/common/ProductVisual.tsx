export function ProductVisual({ imageUrl, name }: { imageUrl?: string | null; name?: string | null }) {
  const safeName = typeof name === "string" && name.trim() ? name.trim() : "Product";
  const safeImageUrl = typeof imageUrl === "string" && imageUrl.trim() ? imageUrl.trim() : null;

  if (safeImageUrl) {
    return <img className="product-image" src={safeImageUrl} alt={safeName} loading="lazy" />;
  }

  return (
    <div className="product-placeholder" aria-label={`${safeName} image placeholder`}>
      <span>{safeName.slice(0, 1).toUpperCase()}</span>
      <small>SHOPSFLOW / OBJECT</small>
    </div>
  );
}
