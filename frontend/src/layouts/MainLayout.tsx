import { Outlet } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useAuth } from "../hooks/useAuth";

function MainLayout() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  return (
    <>
      <Header />
      <Outlet />
      <Footer compact={isAdmin} />
    </>
  );
}

export default MainLayout;
