import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function CustomerRoute() {
  const { isLoggedIn, user } = useAuth();

  if (isLoggedIn && user?.role === "ADMIN") {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}
