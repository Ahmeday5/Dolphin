export interface InDeliveryOrders {
  id?: string | number;
  orderId?: string | number;
  clientId?: string | number;
  clientName?: string;
  clientLocation?: string;               // رابط google maps أو عنوان
  clientphoneNumber?: string;
  deliveryManId?: string | number;
  deliveryManName?: string;
  amount?: number;
  address?: string;
  status?: string;                       // "Pending" | "InDelivery" | ...
  createdAt?: any;
  updatedAt?: any;

  // ──────────────── المهم ────────────────
  currentLocation?: { lat: number; lng: number; timestamp?: any } | null;
  // لو عايز تستخدم array بدل sub-collection (حل أبسط في البداية)
  path?: google.maps.LatLngLiteral[];
}

export type InDeliveryOrdersResponse = InDeliveryOrders[];
