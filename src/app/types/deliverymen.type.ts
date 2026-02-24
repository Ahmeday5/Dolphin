export interface allDeliverymen {
  id: number;
  name: string;
  email?: string;
  password?: string;
  isAvailable: boolean;
  imageUrl?: string;
  deviceToken?: string | null;
  currentLat?: number;  // آخر موقع
  currentLng?: number;
  lastUpdate?: any;     // timestamp
  isOnline?: boolean;
  isDelivering?: boolean;  // flag للتوصيل
  isReturning?: boolean;   // flag للعودة
  currentPath?: { lat: number; lng: number }[];  // المسار المؤقت
}

export interface DeliverymenResponse {
  items: allDeliverymen[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  errorMessage?: string;
}

export interface UpdateDeliverymenResponse {
  success: boolean;
  message: string;
  data?: allDeliverymen;
}
