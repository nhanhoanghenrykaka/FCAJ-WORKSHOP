export function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter((value) => value === 1 || value === totalPages || Math.abs(value - page) <= 2);
  return (
    <nav className="pagination" aria-label="Pagination">
      <button type="button" disabled={page === 1} onClick={() => onPageChange(page - 1)}>← Previous</button>
      {pages.map((value, index) => <span key={value}>{index > 0 && value - pages[index - 1] > 1 && <i>…</i>}<button type="button" className={value === page ? "is-active" : ""} onClick={() => onPageChange(value)}>{value}</button></span>)}
      <button type="button" disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>Next →</button>
    </nav>
  );
}
