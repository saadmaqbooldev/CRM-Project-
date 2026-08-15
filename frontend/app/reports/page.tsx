"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import api from "@/lib/api";

function ReportsContent() {
  const router = useRouter();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Fetch sales report
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ["sales-report", dateFrom, dateTo],
    queryFn: async () => {
      const params: any = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const response = await api.get("/reports/sales", { params });
      return response.data;
    },
  });

  // Fetch top customers
  const { data: topCustomers, isLoading: customersLoading } = useQuery({
    queryKey: ["top-customers"],
    queryFn: async () => {
      const response = await api.get("/reports/top-customers?limit=10");
      return response.data;
    },
  });

  // Fetch top products
  const { data: topProducts, isLoading: productsLoading } = useQuery({
    queryKey: ["top-products"],
    queryFn: async () => {
      const response = await api.get("/reports/top-products?limit=10");
      return response.data;
    },
  });

  const exportCSV = (type: "sales" | "customers" | "products") => {
    let csv = "";
    let filename = "";

    if (type === "sales" && salesData?.daily_breakdown) {
      filename = "sales_report.csv";
      csv = "Date,Orders,Revenue\n";
      salesData.daily_breakdown.forEach((item: any) => {
        csv += `${item.date},${item.order_count},${item.revenue}\n`;
      });
    } else if (type === "customers" && topCustomers) {
      filename = "top_customers.csv";
      csv = "Name,Email,Phone,Orders,Total Spent\n";
      topCustomers.forEach((item: any) => {
        csv += `"${item.name}","${item.email || ""}","${item.phone || ""}",${item.order_count},${item.total_spent}\n`;
      });
    } else if (type === "products" && topProducts) {
      filename = "top_products.csv";
      csv = "Product,Category,Quantity Sold,Revenue\n";
      topProducts.forEach((item: any) => {
        csv += `"${item.name}","${item.category || ""}",${item.quantity_sold},${item.total_revenue}\n`;
      });
    }

    if (csv) {
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <button
          onClick={() => router.push("/reports/outstanding")}
          className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
        >
          💰 Outstanding Balances
        </button>
      </div>

      {/* Sales Report */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Sales Report</h2>
          <div className="flex flex-wrap gap-3">
            <input
              type="date"
              className="px-3 py-2 border border-gray-300 rounded-md"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <input
              type="date"
              className="px-3 py-2 border border-gray-300 rounded-md"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
            <button
              onClick={() => exportCSV("sales")}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Export CSV
            </button>
          </div>
        </div>

        {salesLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-md">
                <p className="text-sm text-blue-600">Total Orders</p>
                <p className="text-2xl font-bold text-blue-900">
                  {salesData?.total_orders || 0}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-md">
                <p className="text-sm text-green-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-900">
                  Rs. {salesData?.total_revenue?.toFixed(2) || "0.00"}
                </p>
              </div>
            </div>

            {/* Daily Breakdown Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Orders
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {salesData?.daily_breakdown?.map((item: any) => (
                    <tr key={item.date} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{item.date}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.order_count}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        Rs. {item.revenue.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {!salesData?.daily_breakdown?.length && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                        No sales data for this period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Top Customers + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Top Customers</h2>
            <button
              onClick={() => exportCSV("customers")}
              className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Export
            </button>
          </div>

          {customersLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Name
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Orders
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Spent
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {topCustomers?.map((customer: any) => (
                    <tr key={customer.customer_id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">
                        {customer.name}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {customer.order_count}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        Rs. {customer.total_spent.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {!topCustomers?.length && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                        No data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top Products */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Top Products</h2>
            <button
              onClick={() => exportCSV("products")}
              className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Export
            </button>
          </div>

          {productsLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Product
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Qty Sold
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {topProducts?.map((product: any) => (
                    <tr key={product.product_id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">
                        {product.name}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {product.quantity_sold}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        Rs. {product.total_revenue.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {!topProducts?.length && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                        No data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <ReportsContent />
      </AppShell>
    </ProtectedRoute>
  );
}