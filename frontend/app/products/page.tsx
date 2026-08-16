"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import Toast from "@/components/Toast";
import LoadingSpinner from "@/components/LoadingSpinner";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import api from "@/lib/api";
import type { Product } from "@/lib/types";

interface ToastState {
  message: string;
  type: "success" | "error";
}

interface ImportResult {
  total_rows: number;
  imported: number;
  failed: number;
  skipped_duplicates: number;
  errors: Array<{ row: number; error: string }>;
  message: string;
}

function ProductsContent() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const lastKeyTimeRef = useRef<number>(0);
  const [barcodeWarning, setBarcodeWarning] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    barcode: "",
    price: "",
    stock_qty: "",
    unit: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const limit = 10;

  const { data: allProducts, isLoading, error: queryError, refetch } = useQuery({
    queryKey: ["products", search, page],
    queryFn: async () => {
      const response = await api.get("/products/", {
        params: { search: search || undefined, page, limit },
      });
      return response.data as Product[];
    },
  });

  // Fetch ALL products for barcode validation (no pagination)
  const { data: allProductsForValidation } = useQuery({
    queryKey: ["all-products-for-barcode"],
    queryFn: async () => {
      const response = await api.get("/products/", {
        params: { limit: 100 },
      });
      return response.data as Product[];
    },
    enabled: showModal, // Only fetch when modal is open
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await api.post("/products/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data as ImportResult;
    },
    onSuccess: (result) => {
      setImportResult(result);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["pos-products"] });
      if (result.imported > 0) {
        setToast({ message: `✅ ${result.imported} items imported!`, type: "success" });
      }
    },
    onError: (err: any) => {
      setToast({ message: "Failed to import items", type: "error" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (productData: any) => {
      const response = await api.post("/products/", {
        ...productData,
        price: parseFloat(productData.price),
        stock_qty: parseInt(productData.stock_qty),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["all-products-for-barcode"] });
      setShowModal(false);
      resetForm();
      setToast({ message: "Item created successfully", type: "success" });
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail;
      const message = typeof detail === "string" ? detail : "Failed to create item";
      setError(message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await api.put(`/products/${id}`, {
        ...data,
        price: parseFloat(data.price),
        stock_qty: parseInt(data.stock_qty),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["all-products-for-barcode"] });
      setShowModal(false);
      resetForm();
      setToast({ message: "Item updated successfully", type: "success" });
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail;
      const message = typeof detail === "string" ? detail : "Failed to update item";
      setError(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setToast({ message: "Item deleted successfully", type: "success" });
    },
    onError: () => {
      setToast({ message: "Failed to delete item", type: "error" });
    },
  });

  const resetForm = () => {
    setFormData({ name: "", category: "", barcode: "", price: "", stock_qty: "", unit: "" });
    setFormErrors({});
    setEditingProduct(null);
    setError("");
    setBarcodeWarning("");
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category || "",
      barcode: product.barcode || "",
      price: product.price.toString(),
      stock_qty: product.stock_qty.toString(),
      unit: product.unit || "",
    });
    setFormErrors({});
    setError("");
    setBarcodeWarning("");
    setShowModal(true);
  };

  // Barcode duplicate check
  const checkBarcodeDuplicate = (barcode: string) => {
    if (!barcode.trim()) {
      setBarcodeWarning("");
      return;
    }
    
    const duplicate = allProductsForValidation?.find(
      (p) => 
        p.barcode === barcode.trim() && 
        p.id !== editingProduct?.id
    );
    
    if (duplicate) {
      setBarcodeWarning(`⚠️ Barcode already used by "${duplicate.name}"`);
    } else {
      setBarcodeWarning("");
    }
  };

  const handleBarcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, barcode: value });
    checkBarcodeDuplicate(value);
  };

  // Barcode scan detection for form field
  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const now = Date.now();
    const timeSinceLastKey = now - lastKeyTimeRef.current;
    
    if (e.key === "Enter") {
      e.preventDefault();
      const value = (e.target as HTMLInputElement).value;
      if (value.trim()) {
        checkBarcodeDuplicate(value);
        setToast({ message: `Barcode captured: ${value}`, type: "success" });
      }
    }
    
    lastKeyTimeRef.current = now;
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = "Name is required";
    if (!formData.price || parseFloat(formData.price) <= 0) errors.price = "Price must be greater than 0";
    if (!formData.stock_qty || parseInt(formData.stock_qty) < 0) errors.stock_qty = "Stock cannot be negative";
    
    // Check barcode duplicate
    if (formData.barcode.trim() && barcodeWarning) {
      errors.barcode = "Barcode is already in use";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validateForm()) return;
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (product: Product) => {
    if (confirm(`Are you sure you want to delete ${product.name}?`)) {
      deleteMutation.mutate(product.id);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get("/products/import-template", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "product_import_template.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
      setToast({ message: "Template downloaded!", type: "success" });
    } catch (err) {
      setToast({ message: "Failed to download template", type: "error" });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportResult(null);
    }
  };

  const handleImport = () => {
    if (!importFile) {
      setToast({ message: "Please select a file first", type: "error" });
      return;
    }
    importMutation.mutate(importFile);
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setImportFile(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Items</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            📥 Import Items
          </button>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            + Add Item
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search by name, category, or barcode..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        {search && (
          <button onClick={() => setSearch("")} className="px-4 py-2 text-gray-500 hover:text-gray-700">
            Clear
          </button>
        )}
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <LoadingSpinner />
        ) : queryError ? (
          <ErrorState message="Failed to load items" onRetry={() => refetch()} />
        ) : allProducts && allProducts.length === 0 ? (
          <EmptyState
            icon="📦"
            title="No items yet"
            description="Add your first item or import from file"
            actionLabel="Add Item"
            onAction={openCreateModal}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Barcode</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allProducts?.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.category || "-"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.barcode || "-"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Rs. {product.price.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-900">{product.stock_qty} {product.unit || "pcs"}</span>
                        {product.stock_qty === 0 && (
                          <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-800 rounded-full">Out of Stock</span>
                        )}
                        {product.stock_qty > 0 && product.low_stock && (
                          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Low Stock</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3">
                      <button onClick={() => openEditModal(product)} className="text-blue-600 hover:text-blue-800">Edit</button>
                      <button onClick={() => handleDelete(product)} className="text-red-600 hover:text-red-800">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
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
          disabled={!allProducts || allProducts.length < limit}
          className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {/* Import Modal - Same as Day 53 */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Import Items</h2>
              <button onClick={closeImportModal} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800 font-medium mb-2">📄 Step 1: Download Template</p>
              <button
                onClick={handleDownloadTemplate}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                ⬇️ Download Template
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-700 font-medium mb-2">📤 Step 2: Upload File</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
              {importFile && (
                <p className="text-sm text-green-600 mt-2">✅ Selected: {importFile.name}</p>
              )}
            </div>

            <button
              onClick={handleImport}
              disabled={!importFile || importMutation.isPending}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-lg font-semibold"
            >
              {importMutation.isPending ? "Importing..." : "📥 Import Items"}
            </button>

            {importResult && (
              <div className={`mt-4 p-4 rounded-lg border ${importResult.failed === 0 ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
                <p className="font-semibold text-gray-900 mb-2">{importResult.message}</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white p-2 rounded-md">
                    <p className="text-xl font-bold text-green-600">{importResult.imported}</p>
                    <p className="text-xs text-gray-500">Imported</p>
                  </div>
                  <div className="bg-white p-2 rounded-md">
                    <p className="text-xl font-bold text-red-600">{importResult.failed}</p>
                    <p className="text-xs text-gray-500">Failed</p>
                  </div>
                  <div className="bg-white p-2 rounded-md">
                    <p className="text-xl font-bold text-yellow-600">{importResult.skipped_duplicates}</p>
                    <p className="text-xs text-gray-500">Duplicates</p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={closeImportModal}
              className="mt-4 w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal with Barcode Field */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingProduct ? "Edit Item" : "Add New Item"}
            </h2>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name *</label>
                <input
                  type="text"
                  className={`mt-1 block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 ${formErrors.name ? "border-red-500" : "border-gray-300"}`}
                  value={formData.name}
                  onChange={(e) => { setFormData({ ...formData, name: e.target.value }); setFormErrors({ ...formErrors, name: "" }); }}
                />
                {formErrors.name && <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <input
                  type="text"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
              </div>

              {/* Barcode Field with Scan Support */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Barcode
                  <span className="text-xs text-gray-400 ml-2">(Scan or type)</span>
                </label>
                <input
                  ref={barcodeInputRef}
                  type="text"
                  className={`mt-1 block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 ${
                    formErrors.barcode || barcodeWarning ? "border-yellow-500" : "border-gray-300"
                  }`}
                  value={formData.barcode}
                  onChange={handleBarcodeChange}
                  onKeyDown={handleBarcodeKeyDown}
                  placeholder="Scan barcode or type manually"
                />
                {barcodeWarning && (
                  <p className="mt-1 text-xs text-yellow-600">{barcodeWarning}</p>
                )}
                {formErrors.barcode && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.barcode}</p>
                )}
                <p className="mt-1 text-xs text-gray-400">
                  💡 Scan a barcode to auto-fill this field
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={`mt-1 block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 ${formErrors.price ? "border-red-500" : "border-gray-300"}`}
                    value={formData.price}
                    onChange={(e) => { setFormData({ ...formData, price: e.target.value }); setFormErrors({ ...formErrors, price: "" }); }}
                  />
                  {formErrors.price && <p className="mt-1 text-xs text-red-600">{formErrors.price}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Stock Qty *</label>
                  <input
                    type="number"
                    min="0"
                    className={`mt-1 block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 ${formErrors.stock_qty ? "border-red-500" : "border-gray-300"}`}
                    value={formData.stock_qty}
                    onChange={(e) => { setFormData({ ...formData, stock_qty: e.target.value }); setFormErrors({ ...formErrors, stock_qty: "" }); }}
                  />
                  {formErrors.stock_qty && <p className="mt-1 text-xs text-red-600">{formErrors.stock_qty}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Unit</label>
                <input
                  type="text"
                  placeholder="pcs, kg, box, bottle..."
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingProduct ? "Update" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <ProductsContent />
      </AppShell>
    </ProtectedRoute>
  );
}