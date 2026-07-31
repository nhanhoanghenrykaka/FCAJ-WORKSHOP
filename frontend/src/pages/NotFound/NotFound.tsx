import { Link } from "react-router-dom";
import { EmptyState } from "../../components/common/EmptyState";

export default function NotFound() {
  return <main className="page-shell"><EmptyState title="Page not found" description="The page you requested does not exist or has moved." action={<Link className="button button-primary" to="/">Return home</Link>} /></main>;
}
