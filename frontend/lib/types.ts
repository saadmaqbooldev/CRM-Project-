export interface Business {
  id: number;
  name: string;
  owner_email: string;
  created_at: string;
}

export interface Customer {
  id: number;
  business_id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  created_at: string;
}

export interface Product {
  id: number;
  business_id: number;
  name: string;
  category?: string;
  price: number;
  stock_qty: number;
  unit?: string;
  attributes?: Record<string, any>;
  created_at: string;
  low_stock?: boolean;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  product_name?: string;
}

export interface Order {
  id: number;
  business_id: number;
  customer_id: number;
  customer_name?: string;
  receipt_no?: string | null;
  status: "pending" | "completed" | "cancelled";
  total_amount: number;
  notes?: string;
  created_at: string;
  items: OrderItem[];
}

export interface ReceiptItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface Receipt {
  receipt_no: string;
  order_id: number;
  business_name: string;
  customer_name: string;
  order_date: string;
  status: string;
  items: ReceiptItem[];
  total_amount: number;
  notes?: string | null;
}

export interface DashboardSummary {
  business_name: string;
  total_customers: number;
  total_products: number;
  low_stock_products: number;
  sales: {
    today: number;
    this_week: number;
    this_month: number;
    total_revenue: number;
  };
  orders: {
    total: number;
    by_status: {
      pending: number;
      completed: number;
      cancelled: number;
    };
  };
  recent_orders: Array<{
    id: number;
    customer_name: string;
    total_amount: number;
    status: string;
    created_at: string;
  }>;
}