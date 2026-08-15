"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import Toast from "@/components/Toast";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorState from "@/components/ErrorState";
import EmptyState from "@/components/EmptyState";
import api from "@/lib/api";

interface OutstandingCustomer {
  customer_id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  balance_due: number;
}

interface OutstandingResponse {
  total_outstanding: number;
  customer_count: number;
  customers: OutstandingCustomer[];
}

function OutstandingContent() {
  const router = useRouter();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["outstanding-balances"],
    queryFn: async () => {
      const response = await api.get("/reports/outstanding-balances");
      return response.data as OutstandingResponse;
    },
    refetchInterval: 30000,
  });

  const handleWhatsAppReminder = (customer: OutstandingCustomer) => {
    if (!customer.phone) {
      setToast({ message: "No phone number available", type: "error" });
      return;
    }

    // Clean phone number (remove +, spaces, dashes)
    const cleanPhone = customer.phone.replace(/[+\s\-()]/g, "");
    
    const message = `Dear ${customer.name},\n\nThis is a friendly reminder from our store. Your current outstanding balance is Rs. ${customer.balance_due.toFixed(2)}. Kindly clear your dues at your earliest convenience.\n\nThank you!`;
    
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, "_blank");
  };

  const handleRecordPayment = (customerId: number) => {
    router.push(`/customers/${customerId}`);
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
        <h1 className="text-2xl font-bold text-gray-900">Outstanding Balances</h1>
        <button
          onClick={() => router.push("/reports")}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
        >
          ← Back to Reports
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorState message="Failed to load outstanding balances" onRetry={() => refetch()} />
      ) : data && data.customers.length === 0 ? (
        <EmptyState
          icon="🎉"
          title="No Outstanding Balances"
          description="All customers have cleared their dues!"
        />
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 rounded-lg shadow text-white">
              <h3 className="text-sm font-medium text-orange-100">Total Outstanding</h3>
              <p className="mt-2 text-3xl font-bold">
                Rs. {data.total_outstanding.toFixed(2)}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Customers with Balance</h3>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {data.customer_count}
              </p>
            </div>
          </div>

          {/* Outstanding List */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Who Owes Me Money
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Balance Due
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.customers.map((customer) => (
                    <tr key={customer.customer_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => router.push(`/customers/${customer.customer_id}`)}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {customer.name}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {customer.phone || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-orange-600">
                          Rs. {customer.balance_due.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3">
                        <button
                          onClick={() => handleWhatsAppReminder(customer)}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 text-xs"
                        >
                          📱 Remind
                        </button>
                        <button
                          onClick={() => handleRecordPayment(customer.customer_id)}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs"
                        >
                          💵 Record Payment
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function OutstandingBalancesPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <OutstandingContent />
      </AppShell>
    </ProtectedRoute>
  );
}