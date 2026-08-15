"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import api from "@/lib/api";
import type { DashboardSummary } from "@/lib/types";

function DashboardContent() {
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const response = await api.get("/dashboard/summary");
      return response.data as DashboardSummary;
    },
    refetchInterval: 30000,
  });

  const { data: salesReport } = useQuery({
    queryKey: ["sales-report"],
    queryFn: async () => {
      const response = await api.get("/reports/sales");
      return response.data;
    },
    refetchInterval: 30000,
  });

  const chartData = salesReport?.daily_breakdown?.map((item: any) => ({
    date: item.date,
    revenue: item.revenue,
    orders: item.order_count,
  })) || [];

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Failed to load dashboard data
        </div>
      ) : data ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Total Customers
                  </h3>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {data.total_customers}
                  </p>
                </div>
                <div className="text-4xl">👥</div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Total Products
                  </h3>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {data.total_products}
                  </p>
                </div>
                <div className="text-4xl">📦</div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Total Orders
                  </h3>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {data.orders.total}
                  </p>
                </div>
                <div className="text-4xl">🛒</div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Total Revenue
                  </h3>
                  <p className="mt-2 text-3xl font-bold text-green-600">
                    Rs. {data.sales.total_revenue.toFixed(2)}
                  </p>
                </div>
                <div className="text-4xl">💰</div>
              </div>
            </div>
          </div>

          {/* Sales Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg shadow text-white">
              <h3 className="text-sm font-medium text-blue-100">Today's Sales</h3>
              <p className="mt-2 text-2xl font-bold">
                Rs. {data.sales.today.toFixed(2)}
              </p>
            </div>

            <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg shadow text-white">
              <h3 className="text-sm font-medium text-green-100">This Week</h3>
              <p className="mt-2 text-2xl font-bold">
                Rs. {data.sales.this_week.toFixed(2)}
              </p>
            </div>

            <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-lg shadow text-white">
              <h3 className="text-sm font-medium text-purple-100">This Month</h3>
              <p className="mt-2 text-2xl font-bold">
                Rs. {data.sales.this_month.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Revenue Over Time
            </h3>
            {chartData.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No sales data available
              </p>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#2563eb"
                      strokeWidth={2}
                      name="Revenue (Rs.)"
                    />
                    <Line
                      type="monotone"
                      dataKey="orders"
                      stroke="#16a34a"
                      strokeWidth={2}
                      name="Orders"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Order Status Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Orders by Status
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      {
                        name: "Pending",
                        count: data.orders.by_status.pending,
                      },
                      {
                        name: "Completed",
                        count: data.orders.by_status.completed,
                      },
                      {
                        name: "Cancelled",
                        count: data.orders.by_status.cancelled,
                      },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" name="Orders" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Recent Orders
              </h3>
              {data.recent_orders.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No orders yet</p>
              ) : (
                <div className="space-y-3">
                  {data.recent_orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between py-2 border-b border-gray-100"
                    >
                      <div>
                        <div className="font-medium text-gray-900">
                          {order.customer_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          #{order.id} •{" "}
                          {new Date(order.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900">
                          Rs. {order.total_amount.toFixed(2)}
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            order.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : order.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <DashboardContent />
      </AppShell>
    </ProtectedRoute>
  );
}