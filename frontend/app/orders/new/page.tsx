"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import Toast from "@/components/Toast";
import api from "@/lib/api";
import type { Customer, Product } from "@/lib/types";

interface LineItem {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
}

interface ToastState {
  message: string;
  type: "success" | "error";
}

function NewOrderContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);
  const [notes, setNotes] = useState("");
  const [paymentType, setPaymentType] = useState<"cash" | "credit">("cash");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [error, setError] = useState("");

  // Fetch customers
  const { data: customers } = useQuery({
    queryKey: ["customers", customerSearch],
    queryFn: async () => {
      const response = await api.get("/customers/", {
        params: { search: customerSearch || undefined, limit: 50 },
      });
      return response.data as Customer[];
    },
  });

  // Fetch products
  const { data: products } = useQuery({
    queryKey: ["products", productSearch],
    queryFn: async () => {
      const response = await api.get("/products/", {
        params: { search: productSearch || undefined, limit: 50 },
      });
      return response.data as Product[];
    },
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await api.post("/orders/", orderData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setToast({ message: "Order created successfully", type: "success" });
      setTimeout(() => {
        router.push("/orders");
      }, 1500);
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail;
      const message = typeof detail === "string" ? detail : "Failed to create order";
      setError(message);
      setToast({ message: "Failed to create order", type: "error" });
    },
  });

  // Calculate total
  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  }, [items]);

  const addItem = (product: Product) => {
    const existingItem = items.find((item) => item.product_id === product.id);
    if (existingItem) {
      setItems(
        items.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setItems([
        ...items,
        {
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          unit_price: product.price,
        },
      ]);
    }
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems(
      items.map((item) =>
        item.product_id === productId ? { ...item, quantity } : item
      )
    );
  };

  const removeItem = (productId: number) => {
    setItems(items.filter((item) => item.product_id !== productId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedCustomer) {
      setError("Please select a customer");
      return;
    }

    if (items.length === 0) {
      setError("Please add at least one item");
      return;
    }

    if (paymentType === "credit" && !selectedCustomer) {
      setError("Credit order requires a customer");
      return;
    }

    const orderData = {
      customer_id: selectedCustomer,
      notes: notes || undefined,
      payment_type: paymentType,
      items: items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
      })),
    };

    createOrderMutation.mutate(orderData);
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

      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Create New Order</h1>
        <button
          onClick={() => router.push("/orders")}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
        >
          Back to Orders
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Selection */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Select Customer
          </h2>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Search customer..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
            />
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md">
              {customers?.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => setSelectedCustomer(customer.id)}
                  className={`w-full px-4 py-2 text-left hover:bg-gray-50 ${
                    selectedCustomer === customer.id
                      ? "bg-blue-50 border-l-4 border-blue-600"
                      : ""
                  }`}
                >
                  <div className="font-medium text-gray-900">{customer.name}</div>
                  <div className="text-sm text-gray-500">
                    {customer.phone || customer.email || ""}
                  </div>
                </button>
              ))}
            </div>
            {selectedCustomer && (
              <div className="text-sm text-green-600">
                ✓ Customer selected (ID: {selectedCustomer})
              </div>
            )}
          </div>
        </div>

        {/* Payment Type */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Payment Type
          </h2>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setPaymentType("cash")}
              className={`flex-1 px-4 py-3 rounded-md font-medium ${
                paymentType === "cash"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              💵 Cash
            </button>
            <button
              type="button"
              onClick={() => setPaymentType("credit")}
              className={`flex-1 px-4 py-3 rounded-md font-medium ${
                paymentType === "credit"
                  ? "bg-orange-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              📝 Credit (Udhaar)
            </button>
          </div>
          {paymentType === "credit" && (
            <p className="text-xs text-orange-600 mt-2">
              ⚠️ This order will be added to the customer's balance
            </p>
          )}
        </div>

        {/* Item Selection */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Add Items
          </h2>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Search item..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md">
              {products?.map((product) => {
                const isOutOfStock =
                  product.stock_qty !== null &&
                  product.stock_qty !== undefined &&
                  product.stock_qty <= 0;

                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addItem(product)}
                    disabled={isOutOfStock}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-gray-900">
                          {product.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {product.stock_qty !== null &&
                          product.stock_qty !== undefined
                            ? `Stock: ${product.stock_qty} ${product.unit || "pcs"}`
                            : "No stock tracking"}
                        </div>
                      </div>
                      <div className="text-green-600 font-medium">
                        Rs. {product.price.toFixed(2)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Order Items
          </h2>
          {items.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No items added yet. Search and click items to add them.
            </p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.product_id}
                  className="flex items-center justify-between py-2 border-b border-gray-100"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {item.product_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      Rs. {item.unit_price.toFixed(2)} each
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(item.product_id, item.quantity - 1)
                      }
                      className="w-8 h-8 bg-gray-200 rounded-md hover:bg-gray-300"
                    >
                      -
                    </button>
                    <span className="w-12 text-center font-medium">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(item.product_id, item.quantity + 1)
                      }
                      className="w-8 h-8 bg-gray-200 rounded-md hover:bg-gray-300"
                    >
                      +
                    </button>
                    <div className="w-24 text-right font-medium">
                      Rs. {(item.quantity * item.unit_price).toFixed(2)}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.product_id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}

              {/* Total */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">
                    Total
                  </span>
                  <span className="text-2xl font-bold text-green-600">
                    Rs. {totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
          <textarea
            rows={3}
            placeholder="Add any notes for this order..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={createOrderMutation.isPending}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-lg font-medium"
          >
            {createOrderMutation.isPending
              ? "Creating Order..."
              : "Create Order"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewOrderPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <NewOrderContent />
      </AppShell>
    </ProtectedRoute>
  );
}