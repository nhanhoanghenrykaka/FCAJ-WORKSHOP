import { useCallback, useEffect, useState, type ReactNode } from "react";
import { getCart } from "../api/storeApi";
import { useAuth } from "../hooks/useAuth";
import type { Cart } from "../types";
import { CartContext, emptyCart } from "./CartContext";

export function CartProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  const [cart, setCart] = useState<Cart>(emptyCart);
  const [isLoading, setIsLoading] = useState(false);

  const refreshCart = useCallback(async () => {
    if (!isLoggedIn) {
      setCart(emptyCart);
      return;
    }
    setIsLoading(true);
    try {
      setCart(await getCart());
    } catch {
      setCart(emptyCart);
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    queueMicrotask(() => void refreshCart());
  }, [refreshCart]);

  return (
    <CartContext.Provider value={{ cart, isLoading, refreshCart, setCart }}>
      {children}
    </CartContext.Provider>
  );
}
