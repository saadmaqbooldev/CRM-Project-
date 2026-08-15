"use client";

import { Receipt } from "@/lib/types";

interface DownloadPDFButtonProps {
  receipt: Receipt;
}

export default function DownloadPDFButton({ receipt }: DownloadPDFButtonProps) {
  const handleDownload = () => {
    // Create print-friendly HTML content
    const receiptHTML = `
      <html>
        <head>
          <title>${receipt.receipt_no}</title>
          <style>
            body {
              font-family: "Courier New", monospace;
              width: 80mm;
              margin: 0 auto;
              padding: 5mm;
            }
            .header {
              text-align: center;
              margin-bottom: 10px;
            }
            .header h2 {
              margin: 0;
              font-size: 16px;
            }
            .header p {
              margin: 2px 0;
              font-size: 11px;
            }
            .divider {
              border-top: 1px dashed #000;
              margin: 8px 0;
            }
            .item {
              margin-bottom: 5px;
              font-size: 11px;
            }
            .item-name {
              font-weight: bold;
            }
            .item-detail {
              display: flex;
              justify-content: space-between;
            }
            .total {
              display: flex;
              justify-content: space-between;
              font-size: 14px;
              font-weight: bold;
              margin-top: 5px;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              font-size: 11px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${receipt.business_name}</h2>
            <p>${receipt.receipt_no}</p>
            <p>${new Date(receipt.order_date).toLocaleString()}</p>
          </div>
          <div class="divider"></div>
          <p style="font-size: 11px;">Customer: ${receipt.customer_name}</p>
          <div class="divider"></div>
          ${receipt.items
            .map(
              (item) => `
                <div class="item">
                  <div class="item-name">${item.product_name}</div>
                  <div class="item-detail">
                    <span>${item.quantity} × ${item.unit_price.toFixed(2)}</span>
                    <span>${item.line_total.toFixed(2)}</span>
                  </div>
                </div>
              `
            )
            .join("")}
          <div class="divider"></div>
          <div class="total">
            <span>TOTAL</span>
            <span>Rs. ${receipt.total_amount.toFixed(2)}</span>
          </div>
          <div class="footer">
            <p>Thank you for your purchase!</p>
            <p>Please visit again</p>
          </div>
        </body>
      </html>
    `;

    // Create Blob and download as HTML (can be opened/saved as PDF)
    const blob = new Blob([receiptHTML], { type: "text/html" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${receipt.receipt_no}.html`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleDownload}
      className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
    >
      📄 Download
    </button>
  );
}