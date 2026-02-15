export interface allOrder {
  id: number;
  amount: number;
  address: string;
  deliveryMan: string;
  client: string;
  orderStatus: string;
  distance: number;
  orderDate: string;
  orderStartDateTime: string;
  orderEndDateTime: string;
  orderLocation: string;
  orderCode: string;
  notes: string;
}

export interface OrdersResponse {
  items: allOrder[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  errorMessage?: string; // حقل اختياري لرسايل الخطأ
}

export interface UpdateOrderResponse {
  success: boolean;
  message: string;
  data?: allOrder;
}
