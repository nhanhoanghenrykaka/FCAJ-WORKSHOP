import { Link } from "react-router-dom";

export function Logo({ compact = false, to = "/" }: { compact?: boolean; to?: string }) {
  return (
    <Link to={to} className="brand" aria-label="Shopsflow home">
      <svg className="brand-mark" viewBox="0 0 26 26" fill="none" aria-hidden="true">
        <rect x="0.5" y="0.5" width="25" height="25" rx="6" fill="currentColor" />
        <path
          d="M9 9H16A2 2 0 0 1 18 11A2 2 0 0 1 16 13H10A2 2 0 0 0 8 15A2 2 0 0 0 10 17H17"
          stroke="var(--accent)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="17" cy="17" r="1.2" fill="var(--accent)" />
      </svg>
      {!compact && <span>shopsflow</span>}
    </Link>
  );
}
