"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { clearToken } from "@/lib/auth";

export default function TopBar() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");

  useEffect(() => {
    const name = localStorage.getItem("business_name") || "Business";
    setBusinessName(name);
  }, []);

  const handleLogout = () => {
    clearToken();
    localStorage.removeItem("business_name");
    router.push("/login");
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-20">
      <div className="flex justify-between items-center px-4 sm:px-6 lg:px-8 h-16">
        <div className="flex items-center">
          <h1 className="text-lg font-semibold text-gray-900 ml-14 lg:ml-0">
            {businessName}
          </h1>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={handleLogout}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}