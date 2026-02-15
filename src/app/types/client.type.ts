export interface allClient {
  id: number;
  name: string;
  phoneNumber: string;
  phoneNumber02: string;
  address: string;
  address02: string;
  location: string;
  clientCode: string;
}

export interface ClientsResponse {
  items: allClient[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  errorMessage?: string; // حقل اختياري لرسايل الخطأ
}

export interface UpdateClientResponse {
  success: boolean;
  message: string;
  data?: allClient;
}
