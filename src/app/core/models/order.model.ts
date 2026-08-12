export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  code: string;
  customerName: string;
  customerPhone?: string;
  items: OrderItem[];
  status: 'pending' | 'confirmed' | 'cancelled';
  total: number;
  createdAt: string;
  confirmedAt?: string;
}

export interface CreateOrderRequest {
  customerName?: string;
  customerPhone?: string;
  items: OrderItem[];
}

export interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
}
