import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";
import "./index.css";
import "./store.css";
import App from "./App";
import { AppErrorBoundary } from "./components/common/AppErrorBoundary";
import { AuthProvider } from "./context/AuthProvider";
import { CartProvider } from "./context/CartProvider";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("The root element is missing from index.html.");
}

createRoot(rootElement).render(
  <StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  </StrictMode>,
);
