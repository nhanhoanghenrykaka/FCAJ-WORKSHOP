import { createContext } from "react";
import type { Cart } from "../types";

export type CartContextValue = {
  cart: Cart;
  isLoading: boolean;
  refreshCart: () => Promise<void>;
  setCart: (cart: Cart) => void;
};

export const emptyCart: Cart = { items: [], totalItems: 0, totalPrice: 0 };
export const CartContext = createContext<CartContextValue | null>(null);
