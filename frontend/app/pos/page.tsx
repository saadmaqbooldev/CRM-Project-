"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import Toast from "@/components/Toast";
import ReceiptSlip from "@/components/ReceiptSlip";
import DownloadPDFButton from "@/components/DownloadPDFButton";
import api from "@/lib/api";
import type { Product, Customer, Receipt } from "@/lib/types";

interface CartItem {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  stock_qty: number | null;
  barcode?: string | null;
}

interface ToastState {
  message: string;
  type: "success" | "error";
}

function POSContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);
  const [paymentType, setPaymentType] = useState<"cash" | "credit">("cash");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [scanStatus, setScanStatus] = useState("");

  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastKeyTimeRef = useRef<number>(0);
  const barcodeBufferRef = useRef<string>("");
  const isScanningRef = useRef<boolean>(false);

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["pos-products"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
  }, [queryClient]);

  const { data: products, isLoading } = useQuery({
    queryKey: ["pos-products", search],
    queryFn: async () => {
      const response = await api.get("/products/", {
        params: { search: search || undefined, limit: 50 },
      });
      return response.data as Product[];
    },
  });

  const { data: customers } = useQuery({
    queryKey: ["pos-customers", customerSearch],
    queryFn: async () => {
      const response = await api.get("/customers/", {
        params: { search: customerSearch || undefined, limit: 20 },
      });
      return response.data as Customer[];
    },
    enabled: showCustomerSelector,
  });

  const quickSaleMutation = useMutation({
    mutationFn: async (saleData: any) => {
      const response = await api.post("/orders/quick-sale", saleData);
      return response.data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });

      setToast({
        message:
          paymentType === "credit"
            ? "Credit sale recorded!"
            : "Sale completed successfully!",
        type: "success",
      });

      try {
        const receiptResponse = await api.get(`/orders/${data.id}/receipt`);
        setReceipt(receiptResponse.data);
      } catch (err) {
        console.error("Failed to fetch receipt:", err);
      }

      setCart([]);
      setSelectedCustomer(null);
      setPaymentType("cash");
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail;
      const message =
        typeof detail === "string" ? detail : "Failed to complete sale";
      setToast({ message, type: "error" });
    },
  });

  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  }, [cart]);

  const totalItems = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const hasOutOfStockItem = useMemo(() => {
    return cart.some(
      (item) =>
        item.stock_qty !== null &&
        item.stock_qty !== undefined &&
        item.quantity > item.stock_qty
    );
  }, [cart]);

  const selectedCustomerName = useMemo(() => {
    return customers?.find((c) => c.id === selectedCustomer)?.name || null;
  }, [customers, selectedCustomer]);

  // ============ BARCODE SCAN DETECTION ============

  const handleBarcodeScan = async (barcode: string) => {
    if (!barcode.trim()) return;

    setScanStatus("Looking up barcode...");

    try {
      const response = await api.get(`/products/by-barcode/${barcode.trim()}`);
      const product = response.data as Product;

      addToCart(product);
      setScanStatus("");
      setSearch("");
      setToast({ message: `✅ ${product.name} added to cart`, type: "success" });
    } catch (err: any) {
      if (err.response?.status === 404) {
        setScanStatus(`Product not found for barcode: ${barcode}`);
        setToast({
          message: `❌ No product found for barcode: ${barcode}`,
          type: "error",
        });
      } else {
        setScanStatus("Error looking up barcode");
        setToast({ message: "Error looking up barcode", type: "error" });
      }
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const now = Date.now();
    const timeSinceLastKey = now - lastKeyTimeRef.current;

    if (e.key === "Enter") {
      const currentValue = (e.target as HTMLInputElement).value;

      if (isScanningRef.current && currentValue.trim().length >= 5) {
        e.preventDefault();
        handleBarcodeScan(currentValue);
        (e.target as HTMLInputElement).value = "";
        setSearch("");
        barcodeBufferRef.current = "";
        isScanningRef.current = false;
      }
      lastKeyTimeRef.current = now;
      return;
    }

    if (timeSinceLastKey < 50 && timeSinceLastKey > 0) {
      isScanningRef.current = true;
    } else if (timeSinceLastKey > 200) {
      isScanningRef.current = false;
    }

    lastKeyTimeRef.current = now;
  };

  // ============ END BARCODE DETECTION ============

  const addToCart = (product: Product) => {
    // Only check stock if stock is tracked (not null)
    if (
      product.stock_qty !== null &&
      product.stock_qty !== undefined &&
      product.stock_qty <= 0
    ) {
      setToast({ message: `${product.name} is out of stock`, type: "error" });
      return;
    }

    setCart((prevCart) => {
      const existingItem = prevCart.find(
        (item) => item.product_id === product.id
      );

      if (existingItem) {
        if (
          product.stock_qty !== null &&
          product.stock_qty !== undefined &&
          existingItem.quantity >= product.stock_qty
        ) {
          setToast({
            message: `Only ${product.stock_qty} ${product.name} in stock`,
            type: "error",
          });
          return prevCart;
        }
        return prevCart.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...prevCart,
        {
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          unit_price: product.price,
          stock_qty: product.stock_qty !== undefined ? product.stock_qty : null,
          barcode: product.barcode || null,
        },
      ];
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart((prevCart) => {
      return prevCart
        .map((item) => {
          if (item.product_id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (
              item.stock_qty !== null &&
              item.stock_qty !== undefined &&
              newQty > item.stock_qty
            ) {
              setToast({
                message: `Only ${item.stock_qty} in stock`,
                type: "error",
              });
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null);
    });
  };

  const removeFromCart = (productId: number) => {
    setCart((prevCart) =>
      prevCart.filter((item) => item.product_id !== productId)
    );
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setPaymentType("cash");
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      setToast({ message: "Cart is empty", type: "error" });
      return;
    }

    if (hasOutOfStockItem) {
      setToast({ message: "Some items exceed available stock", type: "error" });
      return;
    }

    if (paymentType === "credit" && !selectedCustomer) {
      setToast({
        message: "Credit sale requires a customer. Please select a customer.",
        type: "error",
      });
      return;
    }

    if (paymentType === "credit" && selectedCustomerName) {
      const confirmCredit = confirm(
        `This sale of Rs. ${totalAmount.toFixed(2)} will be added to ${selectedCustomerName}'s balance as credit.\n\nContinue?`
      );
      if (!confirmCredit) return;
    }

    const saleData: any = {
      items: cart.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
      })),
      payment_type: paymentType,
    };

    if (selectedCustomer) {
      saleData.customer_id = selectedCustomer;
    } else {
      saleData.customer_name = "Walk-in Customer";
    }

    quickSaleMutation.mutate(saleData);
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
        <h1 className="text-2xl font-bold text-gray-900">POS / Quick Sale</h1>
        <button
          onClick={() => router.push("/orders")}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
        >
          View Orders
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search with Barcode Detection */}
          <div className="bg-white p-4 rounded-lg shadow">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Scan barcode or search items..."
              className="w-full px-4 py-3 border border-gray-300 rounded-md text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              autoFocus
            />
            {scanStatus && (
              <p
                className={`text-sm mt-2 ${
                  scanStatus.includes("not found") || scanStatus.includes("Error")
                    ? "text-red-600"
                    : "text-blue-600"
                }`}
              >
                {scanStatus}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              💡 Tip: Scan barcode directly — it will auto-add to cart
            </p>
          </div>

          {/* Product Grid */}
          <div className="bg-white p-4 rounded-lg shadow">
            {isLoading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              </div>
            ) : products && products.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No items found</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {products?.map((product) => {
                  const isOutOfStock =
                    product.stock_qty !== null &&
                    product.stock_qty !== undefined &&
                    product.stock_qty <= 0;
                  const cartItem = cart.find(
                    (item) => item.product_id === product.id
                  );
                  const isMaxedOut =
                    cartItem &&
                    product.stock_qty !== null &&
                    product.stock_qty !== undefined &&
                    cartItem.quantity >= product.stock_qty;

                  return (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      disabled={isOutOfStock || isMaxedOut}
                      className={`p-4 rounded-lg border text-left transition-all relative ${
                        isOutOfStock
                          ? "bg-gray-100 border-gray-200 cursor-not-allowed opacity-50"
                          : isMaxedOut
                          ? "bg-blue-50 border-blue-300 cursor-not-allowed"
                          : "bg-white border-gray-200 hover:border-blue-500 hover:shadow-md cursor-pointer"
                      }`}
                    >
                      <div className="text-lg font-semibold text-gray-900">
                        {product.name}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {product.category || "General"}
                      </div>
                      {product.barcode && (
                        <div className="text-xs text-gray-400 mt-1">
                          {product.barcode}
                        </div>
                      )}
                      <div className="text-blue-600 font-bold mt-2">
                        Rs. {product.price.toFixed(2)}
                      </div>
                      <div
                        className={`text-xs mt-1 ${
                          isOutOfStock
                            ? "text-red-600 font-semibold"
                            : product.stock_qty !== null &&
                              product.stock_qty !== undefined &&
                              product.stock_qty <= 5
                            ? "text-red-600"
                            : "text-gray-500"
                        }`}
                      >
                        {isOutOfStock
                          ? "Out of Stock"
                          : product.stock_qty !== null &&
                            product.stock_qty !== undefined
                          ? `Stock: ${product.stock_qty} ${product.unit || "pcs"}`
                          : "No stock tracking"}
                      </div>
                      {cartItem && (
                        <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                          {cartItem.quantity}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Cart */}
        <div className="bg-white rounded-lg shadow flex flex-col h-fit lg:sticky lg:top-20">
          <div className="p-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Cart</h2>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Clear All
                </button>
              )}
            </div>
            <p className="text-sm text-gray-500">{totalItems} items</p>
          </div>

          {/* Payment Type Toggle */}
          <div className="p-4 border-b border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Type
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setPaymentType("cash")}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium ${
                  paymentType === "cash"
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                💵 Cash
              </button>
              <button
                onClick={() => setPaymentType("credit")}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium ${
                  paymentType === "credit"
                    ? "bg-orange-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                📝 Credit
              </button>
            </div>
            {paymentType === "credit" && (
              <p className="text-xs text-orange-600 mt-2">
                ⚠️ Credit sale requires a customer selection
              </p>
            )}
          </div>

          {/* Customer Selector */}
          <div className="p-4 border-b border-gray-200">
            <button
              onClick={() => setShowCustomerSelector(!showCustomerSelector)}
              className={`w-full flex justify-between items-center px-4 py-2 border rounded-md hover:bg-gray-50 ${
                paymentType === "credit" && !selectedCustomer
                  ? "border-orange-500 border-2"
                  : "border-gray-300"
              }`}
            >
              <span className="text-sm">
                {selectedCustomer
                  ? selectedCustomerName || "Customer Selected"
                  : paymentType === "credit"
                  ? "⚠️ Select Customer (Required)"
                  : "👤 Walk-in Customer"}
              </span>
              <span className="text-gray-500">▼</span>
            </button>

            {showCustomerSelector && (
              <div className="mt-2 space-y-2">
                {paymentType === "cash" && (
                  <button
                    onClick={() => {
                      setSelectedCustomer(null);
                      setShowCustomerSelector(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    👤 Walk-in Customer (Default)
                  </button>
                )}
                <input
                  type="text"
                  placeholder="Search customer..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />
                <div className="max-h-32 overflow-y-auto">
                  {customers?.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => {
                        setSelectedCustomer(customer.id);
                        setShowCustomerSelector(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                        selectedCustomer === customer.id ? "bg-blue-50" : ""
                      }`}
                    >
                      {customer.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Credit Confirmation */}
          {paymentType === "credit" && selectedCustomer && selectedCustomerName && (
            <div className="mx-4 my-3 p-3 bg-orange-50 border border-orange-200 rounded-md">
              <p className="text-sm text-orange-800">
                📝 This sale of{" "}
                <strong>Rs. {totalAmount.toFixed(2)}</strong> will be added to{" "}
                <strong>{selectedCustomerName}</strong>'s balance.
              </p>
            </div>
          )}

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto max-h-48 p-4 space-y-3">
            {cart.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                Scan barcode or tap items to add
              </p>
            ) : (
              cart.map((item) => (
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.product_id, -1)}
                      className="w-8 h-8 bg-gray-200 rounded-md hover:bg-gray-300 font-bold"
                    >
                      -
                    </button>
                    <span className="w-10 text-center font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.product_id, 1)}
                      className="w-8 h-8 bg-gray-200 rounded-md hover:bg-gray-300 font-bold"
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeFromCart(item.product_id)}
                      className="ml-2 text-red-600 hover:text-red-800 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Total + Checkout */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-semibold text-gray-900">Total</span>
              <span className="text-2xl font-bold text-green-600">
                Rs. {totalAmount.toFixed(2)}
              </span>
            </div>
            {hasOutOfStockItem && (
              <p className="text-red-600 text-sm mb-3">
                ⚠️ Some items exceed available stock
              </p>
            )}
            <button
              onClick={handleCheckout}
              disabled={
                cart.length === 0 ||
                hasOutOfStockItem ||
                quickSaleMutation.isPending ||
                (paymentType === "credit" && !selectedCustomer)
              }
              className={`w-full px-6 py-3 rounded-md disabled:opacity-50 text-lg font-semibold ${
                paymentType === "credit"
                  ? "bg-orange-600 text-white hover:bg-orange-700"
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              {quickSaleMutation.isPending
                ? "Processing..."
                : paymentType === "credit"
                ? `Complete Credit Sale`
                : "Complete Sale"}
            </button>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      {receipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">✅ Sale Complete</h2>
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
              <button
                onClick={() => setReceipt(null)}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                New Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function POSPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <POSContent />
      </AppShell>
    </ProtectedRoute>
  );
}