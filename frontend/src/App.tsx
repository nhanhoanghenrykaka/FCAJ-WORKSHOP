import { Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import MainLayout from "./layouts/MainLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import ProtectedRoute from "./routes/ProtectedRoute";
import CustomerRoute from "./routes/CustomerRoute";
import { Home } from "./pages/Home/Home";
import Catalog from "./pages/Catalog/Catalog";
import ProductDetail from "./pages/ProductDetail/ProductDetail";
import Cart from "./pages/Cart/Cart";
import Orders from "./pages/Orders/Orders";
import PaymentResult from "./pages/PaymentResult/PaymentResult";
import Admin from "./pages/Admin/Admin";
import Notifications from "./pages/Notifications/Notifications";
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import NotFound from "./pages/NotFound/NotFound";
import Account from "./pages/Account/Account";
import OrderDetail from "./pages/OrderDetail/OrderDetail";
import Support from "./pages/Support/Support";
import AdminOperations from "./pages/AdminOperations/AdminOperations";
import AdminProfile from "./pages/Account/AdminProfile";

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<MainLayout />}>
          <Route element={<CustomerRoute />}>
            <Route path="/" element={<Home />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/products/:id" element={<ProductDetail />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/cart" element={<Cart />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/orders/:id" element={<OrderDetail />} />
              <Route path="/account" element={<Account />} />
              <Route path="/support" element={<Support />} />
              <Route path="/payment-result" element={<PaymentResult />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/notifications" element={<Notifications />} />
          </Route>

          <Route element={<ProtectedRoute role="ADMIN" />}>
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/operations" element={<AdminOperations />} />
            <Route path="/admin/orders/:id" element={<OrderDetail />} />
            <Route path="/admin/profile" element={<AdminProfile />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
      <ToastContainer position="top-right" autoClose={3000} closeOnClick theme="light" />
    </>
  );
}

export default App;
