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

export interface OrderPage {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type OrderStatus = 'pending' | 'confirmed' | 'cancelled';

export interface OrderStatusResponse {
  code: string;
  status: OrderStatus;
  confirmedAt?: string;
}

export type SummaryRange = 'day' | 'week' | 'month';

export interface TopProduct {
  productId: string;
  productName: string;
  units: number;
  revenue: number;
}

export interface CategorySummary {
  categoryName: string;
  units: number;
  revenue: number;
}

export interface OrderSummary {
  range: SummaryRange;
  from: string;
  to: string;
  sales: number;
  cancelled: number;
  pending: number;
  totalOrders: number;
  revenue: number;
  units: number;
  topProducts: TopProduct[];
  byCategory: CategorySummary[];
}
