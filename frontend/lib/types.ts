// Add at the top of the file
export interface Business {
  id: number;
  name: string;
  owner_email: string;
  phone?: string | null;
  is_verified: boolean;
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
  balance_due: number;
  created_at: string;
}

export interface Product {
  id: number;
  business_id: number;
  name: string;
  category?: string;
  barcode?: string | null;
  price: number;
  stock_qty: number | null;  // null = not tracked
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
  payment_type: "cash" | "credit";
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
  payment_type: string;
  items: ReceiptItem[];
  total_amount: number;
  notes?: string | null;
}

export interface PaymentRecord {
  id: number;
  business_id: number;
  customer_id: number;
  amount: number;
  note?: string | null;
  created_at: string;
  balance_after?: number | null;
}

export interface OutstandingCustomer {
  customer_id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  balance_due: number;
}

export interface OutstandingResponse {
  total_outstanding: number;
  customer_count: number;
  customers: OutstandingCustomer[];
}

export interface DashboardSummary {
  business_name: string;
  total_customers: number;
  total_products: number;
  low_stock_products: number;
  total_outstanding: number;
  customers_with_balance: number;
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
    payment_type: string;
    created_at: string;
  }>;
}