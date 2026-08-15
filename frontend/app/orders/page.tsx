"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import Toast from "@/components/Toast";
import LoadingSpinner from "@/components/LoadingSpinner";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import ReceiptSlip from "@/components/ReceiptSlip";
import DownloadPDFButton from "@/components/DownloadPDFButton";
import api from "@/lib/api";
import type { Order, Receipt } from "@/lib/types";

interface ToastState {
  message: string;
  type: "success" | "error";
}

function OrdersContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const limit = 10;

  const { data, isLoading, error: queryError, refetch } = useQuery({
    queryKey: ["orders", page, statusFilter, dateFrom, dateTo],
    queryFn: async () => {
      const params: any = { page, limit };
      if (statusFilter) params.status = statusFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      
      const response = await api.get("/orders/", { params });
      return response.data as Order[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await api.put(`/orders/${id}/status`, { status });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setSelectedOrder(null);
      setToast({ message: "Order status updated", type: "success" });
    },
    onError: (err: any) => {
      setToast({
        message: err.response?.data?.detail || "Failed to update status",
        type: "error",
      });
    },
  });

  const handleStatusChange = (orderId: number, newStatus: string) => {
    if (confirm(`Change order #${orderId} status to ${newStatus}?`)) {
      updateStatusMutation.mutate({ id: orderId, status: newStatus });
    }
  };

  const handleViewReceipt = async (orderId: number) => {
    try {
      const response = await api.get(`/orders/${orderId}/receipt`);
      setReceipt(response.data);
      setSelectedOrder(null);
    } catch (err: any) {
      setToast({
        message: err.response?.data?.detail || "Failed to load receipt",
        type: "error",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <button
          onClick={() => router.push("/orders/new")}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          + New Order
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow flex flex-wrap gap-4">
        <select
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <input
          type="date"
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}
        />

        <input
          type="date"
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
        />

        {(statusFilter || dateFrom || dateTo) && (
          <button
            onClick={() => {
              setStatusFilter("");
              setDateFrom("");
              setDateTo("");
              setPage(1);
            }}
            className="px-4 py-2 text-gray-500 hover:text-gray-700"
          >
            Clear Filters
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <LoadingSpinner />
        ) : queryError ? (
          <ErrorState message="Failed to load orders" onRetry={() => refetch()} />
        ) : data && data.length === 0 ? (
          <EmptyState
            icon="🛒"
            title="No orders yet"
            description="Create your first order to get started"
            actionLabel="New Order"
            onAction={() => router.push("/orders/new")}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Receipt No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data?.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.receipt_no || `INV-${order.id.toString().padStart(4, "0")}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.customer_name || `Customer #${order.customer_id}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Rs. {order.total_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleViewReceipt(order.id)}
                        className="text-green-600 hover:text-green-800"
                      >
                        Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-sm text-gray-600">Page {page}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={!data || data.length < limit}
          className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Order #{selectedOrder.id}
              </h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="font-semibold text-gray-900 mb-2">Customer</h3>
                <p className="text-gray-700">{selectedOrder.customer_name}</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Items</h3>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Product
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Qty
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Unit Price
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedOrder.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {item.product_name || `Product #${item.product_id}`}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          Rs. {item.unit_price.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          Rs. {(item.quantity * item.unit_price).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center border-t border-gray-200 pt-4">
                <span className="text-lg font-semibold text-gray-900">Total</span>
                <span className="text-2xl font-bold text-green-600">
                  Rs. {selectedOrder.total_amount.toFixed(2)}
                </span>
              </div>

              {selectedOrder.notes && (
                <div className="bg-yellow-50 p-4 rounded-md">
                  <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
                  <p className="text-gray-700">{selectedOrder.notes}</p>
                </div>
              )}

              <div className="border-t border-gray-200 pt-4">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Update Status
                </h3>
                <div className="flex gap-3">
                  {["pending", "completed", "cancelled"].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(selectedOrder.id, status)}
                      disabled={
                        selectedOrder.status === status ||
                        updateStatusMutation.isPending
                      }
                      className={`flex-1 px-4 py-2 rounded-md text-sm font-medium capitalize ${
                        selectedOrder.status === status
                          ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                          : status === "completed"
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : status === "cancelled"
                          ? "bg-red-600 text-white hover:bg-red-700"
                          : "bg-yellow-500 text-white hover:bg-yellow-600"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {receipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Receipt</h2>
              <button
                onClick={() => setReceipt(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="border border-gray-300 rounded-lg p-4 bg-white">
              <ReceiptSlip receipt={receipt} />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => window.print()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                🖨️ Print
              </button>
              <DownloadPDFButton receipt={receipt} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <OrdersContent />
      </AppShell>
    </ProtectedRoute>
  );
}