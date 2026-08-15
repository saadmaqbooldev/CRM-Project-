"use client";

import { Receipt } from "@/lib/types";

interface ReceiptSlipProps {
  receipt: Receipt;
}

export default function ReceiptSlip({ receipt }: ReceiptSlipProps) {
  return (
    <div className="receipt-slip">
      {/* Receipt Content */}
      <div className="text-center mb-3">
        <h3 className="text-lg font-bold uppercase">{receipt.business_name}</h3>
        <p className="text-xs text-gray-600">{receipt.receipt_no}</p>
        <p className="text-xs text-gray-600">
          {new Date(receipt.order_date).toLocaleString()}
        </p>
      </div>

      <div className="border-t border-b border-dashed border-gray-400 py-2 mb-3">
        <div className="flex justify-between text-xs">
          <span>Customer:</span>
          <span className="font-semibold">{receipt.customer_name}</span>
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span>Status:</span>
          <span className="font-semibold uppercase">{receipt.status}</span>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-2 mb-3">
        {receipt.items.map((item, index) => (
          <div key={index} className="text-xs">
            <div className="font-semibold">{item.product_name}</div>
            <div className="flex justify-between">
              <span>
                {item.quantity} × {item.unit_price.toFixed(2)}
              </span>
              <span className="font-semibold">
                {item.line_total.toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="border-t border-dashed border-gray-400 pt-2 mb-4">
        <div className="flex justify-between text-sm font-bold">
          <span>TOTAL</span>
          <span>Rs. {receipt.total_amount.toFixed(2)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-600">
        <p>Thank you for your purchase!</p>
        <p className="mt-1">Please visit again</p>
      </div>
    </div>
  );
}