const ORDER_SYNC_CHANNEL = "shopsflow-order-sync";

type OrderSyncMessage = {
  type: "orders-changed";
  orderId?: number;
  timestamp: number;
};

export function broadcastOrdersChanged(orderId?: number) {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return;

  const channel = new BroadcastChannel(ORDER_SYNC_CHANNEL);
  const message: OrderSyncMessage = {
    type: "orders-changed",
    orderId,
    timestamp: Date.now(),
  };

  channel.postMessage(message);
  channel.close();
}

export function subscribeToOrderChanges(onChange: () => void) {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return () => undefined;
  }

  const channel = new BroadcastChannel(ORDER_SYNC_CHANNEL);
  const handleMessage = (event: MessageEvent<OrderSyncMessage>) => {
    if (event.data?.type === "orders-changed") onChange();
  };

  channel.addEventListener("message", handleMessage);

  return () => {
    channel.removeEventListener("message", handleMessage);
    channel.close();
  };
}
