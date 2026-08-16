"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  Users,
  Package,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import StatCard from "@/components/StatCard";
import api from "@/lib/api";
import type { DashboardSummary } from "@/lib/types";

function DashboardContent() {
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-50 text-green-700 border border-green-200";
      case "pending":
        return "bg-yellow-50 text-yellow-700 border border-yellow-200";
      case "cancelled":
        return "bg-red-50 text-red-700 border border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          Failed to load dashboard data
        </div>
      ) : data ? (
        <>
          {/* Main Stats Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Customers"
              value={data.total_customers}
              icon={Users}
              iconBgColor="bg-blue-50"
              iconColor="text-blue-600"
              accentColor="border-l-blue-500"
              delay={0}
            />
            <StatCard
              label="Total Items"
              value={data.total_products}
              icon={Package}
              iconBgColor="bg-indigo-50"
              iconColor="text-indigo-600"
              accentColor="border-l-indigo-500"
              delay={100}
            />
            <StatCard
              label="Total Orders"
              value={data.orders.total}
              icon={ShoppingCart}
              iconBgColor="bg-purple-50"
              iconColor="text-purple-600"
              accentColor="border-l-purple-500"
              delay={200}
            />
            <StatCard
              label="Total Revenue"
              value={data.sales.total_revenue}
              icon={DollarSign}
              iconBgColor="bg-green-50"
              iconColor="text-green-600"
              accentColor="border-l-green-500"
              valuePrefix="Rs. "
              decimals={2}
              delay={300}
            />
          </div>

          {/* Sales Period Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div
              className="bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 p-6 animate-fade-in-up border-l-4 border-l-blue-500"
              style={{ animationDelay: "400ms" }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Today's Sales</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    Rs. {data.sales.today.toFixed(2)}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Clock size={18} strokeWidth={2} />
                </div>
              </div>
            </div>

            <div
              className="bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 p-6 animate-fade-in-up border-l-4 border-l-blue-500"
              style={{ animationDelay: "500ms" }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">This Week</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    Rs. {data.sales.this_week.toFixed(2)}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <TrendingUp size={18} strokeWidth={2} />
                </div>
              </div>
            </div>

            <div
              className="bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 p-6 animate-fade-in-up border-l-4 border-l-blue-500"
              style={{ animationDelay: "600ms" }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">This Month</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    Rs. {data.sales.this_month.toFixed(2)}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <TrendingUp size={18} strokeWidth={2} />
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Chart with Dual Y-Axis */}
          <div
            className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 animate-fade-in-up"
            style={{ animationDelay: "700ms" }}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              Revenue Over Time
            </h3>

            {chartData.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No sales data available</p>
            ) : (
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />

                    {/* X-Axis */}
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      axisLine={{ stroke: "#e2e8f0" }}
                      tickLine={false}
                      padding={{ left: 10, right: 10 }}
                    />

                    {/* Left Y-axis — Revenue (Blue) */}
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 12, fill: "#2563eb" }}
                      axisLine={{ stroke: "#2563eb", strokeWidth: 1 }}
                      tickLine={false}
                      tickFormatter={(value) => `Rs. ${value.toLocaleString()}`}
                      width={80}
                    />

                    {/* Right Y-axis — Orders (Green) */}
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 12, fill: "#16a34a" }}
                      axisLine={{ stroke: "#16a34a", strokeWidth: 1 }}
                      tickLine={false}
                      allowDecimals={false}
                      width={40}
                    />

                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                        fontSize: "13px",
                        padding: "12px",
                      }}
                      labelStyle={{
                        fontWeight: 600,
                        color: "#1f2937",
                        marginBottom: "8px",
                      }}
                      formatter={(value: any, name: string) => {
                        if (name === "Revenue (Rs.)") {
                          return [
                            `Rs. ${Number(value).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}`,
                            name,
                          ];
                        }
                        return [value, name];
                      }}
                    />

                    {/* Legend at top */}
                    <Legend
                      verticalAlign="top"
                      height={36}
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{
                        fontSize: "13px",
                        paddingBottom: "8px",
                        color: "#4b5563",
                      }}
                    />

                    {/* Revenue Area with gradient — Left Axis */}
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      fill="url(#revenueGradient)"
                      name="Revenue (Rs.)"
                      dot={false}
                      activeDot={{
                        r: 5,
                        strokeWidth: 2,
                        stroke: "#fff",
                        fill: "#2563eb",
                      }}
                    />

                    {/* Orders Line — clean, no gradient — Right Axis */}
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="orders"
                      stroke="#16a34a"
                      strokeWidth={2}
                      strokeLinecap="round"
                      name="Orders"
                      dot={false}
                      activeDot={{
                        r: 5,
                        strokeWidth: 2,
                        stroke: "#fff",
                        fill: "#16a34a",
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Order Status + Recent Orders */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Order Status */}
            <div
              className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 animate-fade-in-up"
              style={{ animationDelay: "800ms" }}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Orders by Status
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-100 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock size={18} className="text-yellow-600" />
                    <span className="text-sm font-medium text-gray-700">Pending</span>
                  </div>
                  <span className="text-xl font-bold text-yellow-600">
                    {data.orders.by_status.pending}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-green-50 border border-green-100 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={18} className="text-green-600" />
                    <span className="text-sm font-medium text-gray-700">Completed</span>
                  </div>
                  <span className="text-xl font-bold text-green-600">
                    {data.orders.by_status.completed}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-red-50 border border-red-100 rounded-lg">
                  <div className="flex items-center gap-3">
                    <XCircle size={18} className="text-red-600" />
                    <span className="text-sm font-medium text-gray-700">Cancelled</span>
                  </div>
                  <span className="text-xl font-bold text-red-600">
                    {data.orders.by_status.cancelled}
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Orders */}
            <div
              className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 animate-fade-in-up"
              style={{ animationDelay: "900ms" }}
            >
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
                      className="flex items-center justify-between py-3 px-4 border-b border-gray-100 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div>
                        <div className="font-medium text-gray-900 text-sm">
                          {order.customer_name}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          #{order.id} • {new Date(order.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900 text-sm">
                          Rs. {order.total_amount.toFixed(2)}
                        </div>
                        <span
                          className={`inline-block mt-1 text-xs px-2.5 py-0.5 rounded-full font-medium ${getStatusBadge(
                            order.status
                          )}`}
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