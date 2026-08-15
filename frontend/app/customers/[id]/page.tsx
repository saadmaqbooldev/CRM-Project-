"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import Toast from "@/components/Toast";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorState from "@/components/ErrorState";
import api from "@/lib/api";
import type { Customer } from "@/lib/types";

interface PaymentRecord {
  id: number;
  business_id: number;
  customer_id: number;
  amount: number;
  note?: string | null;
  created_at: string;
  balance_after?: number | null;
}

interface ToastState {
  message: string;
  type: "success" | "error";
}

function CustomerLedgerContent() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const customerId = parseInt(params.id as string);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [error, setError] = useState("");

  // Fetch customer
  const { data: customer, isLoading, error: queryError, refetch } = useQuery({
    queryKey: ["customer", customerId],
    queryFn: async () => {
      const response = await api.get(`/customers/${customerId}`);
      return response.data as Customer;
    },
    enabled: !!customerId,
  });

  // Fetch payments
  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["customer-payments", customerId],
    queryFn: async () => {
      const response = await api.get(`/customers/${customerId}/payments`);
      return response.data as PaymentRecord[];
    },
    enabled: !!customerId,
  });

  // Record payment mutation
  const paymentMutation = useMutation({
    mutationFn: async (paymentData: { amount: number; note?: string }) => {
      const response = await api.post(`/customers/${customerId}/payments`, paymentData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", customerId] });
      queryClient.invalidateQueries({ queryKey: ["customer-payments", customerId] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setShowPaymentModal(false);
      setPaymentAmount("");
      setPaymentNote("");
      setError("");
      setToast({ message: "Payment recorded successfully!", type: "success" });
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail;
      const message = typeof detail === "string" ? detail : "Failed to record payment";
      setError(message);
    },
  });

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      setError("Enter a valid payment amount");
      return;
    }

    if (customer && amount > customer.balance_due) {
      setError(`Payment cannot exceed balance due (Rs. ${customer.balance_due.toFixed(2)})`);
      return;
    }

    paymentMutation.mutate({
      amount: amount,
      note: paymentNote || undefined,
    });
  };

  const totalPaid = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;

  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Back button */}
      <button
        onClick={() => router.push("/customers")}
        className="flex items-center text-gray-600 hover:text-gray-900"
      >
        ← Back to Customers
      </button>

      {isLoading ? (
        <LoadingSpinner />
      ) : queryError ? (
        <ErrorState message="Failed to load customer" onRetry={() => refetch()} />
      ) : customer ? (
        <>
          {/* Customer Info + Balance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Info */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold text-gray-900">{customer.name}</h2>
              <div className="mt-4 space-y-2">
                {customer.phone && (
                  <p className="text-sm text-gray-600">📞 {customer.phone}</p>
                )}
                {customer.email && (
                  <p className="text-sm text-gray-600">✉️ {customer.email}</p>
                )}
                {customer.address && (
                  <p className="text-sm text-gray-600">📍 {customer.address}</p>
                )}
              </div>
            </div>

            {/* Balance Card */}
            <div
              className={`p-6 rounded-lg shadow ${
                customer.balance_due > 0
                  ? "bg-orange-50 border-2 border-orange-300"
                  : "bg-green-50 border-2 border-green-300"
              }`}
            >
              <h3 className="text-sm font-medium text-gray-600">Balance Due</h3>
              <p
                className={`text-4xl font-bold ${
                  customer.balance_due > 0 ? "text-orange-600" : "text-green-600"
                }`}
              >
                Rs. {customer.balance_due.toFixed(2)}
              </p>
              {customer.balance_due > 0 ? (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                >
                  💵 Record Payment
                </button>
              ) : (
                <p className="mt-2 text-sm text-green-700">
                  ✅ No outstanding balance
                </p>
              )}
            </div>
          </div>

          {/* Payment History */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
              {customer.balance_due > 0 && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  + Add Payment
                </button>
              )}
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-xs text-gray-500">Total Payments</p>
                <p className="text-xl font-bold text-gray-900">
                  Rs. {totalPaid.toFixed(2)}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-xs text-gray-500">Number of Payments</p>
                <p className="text-xl font-bold text-gray-900">
                  {payments?.length || 0}
                </p>
              </div>
            </div>

            {paymentsLoading ? (
              <LoadingSpinner />
            ) : payments && payments.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No payments recorded yet
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Note
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {payments?.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {new Date(payment.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-green-600">
                          Rs. {payment.amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {payment.note || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Record Payment Modal */}
          {showPaymentModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Record Payment
                </h2>

                <p className="text-sm text-gray-600 mb-4">
                  Current balance due:{" "}
                  <span className="font-bold text-orange-600">
                    Rs. {customer.balance_due.toFixed(2)}
                  </span>
                </p>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmitPayment} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Amount *
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="Enter amount"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Note
                    </label>
                    <input
                      type="text"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                      value={paymentNote}
                      onChange={(e) => setPaymentNote(e.target.value)}
                      placeholder="Optional note"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={paymentMutation.isPending}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {paymentMutation.isPending ? "Recording..." : "Record Payment"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPaymentModal(false);
                        setError("");
                      }}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

export default function CustomerLedgerPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <CustomerLedgerContent />
      </AppShell>
    </ProtectedRoute>
  );
}