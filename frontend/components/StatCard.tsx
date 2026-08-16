"use client";

import { LucideIcon } from "lucide-react";
import CountUpNumber from "./CountUpNumber";

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  valuePrefix?: string;
  valueSuffix?: string;
  decimals?: number;
  delay?: number;
  accentColor?: string;
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  iconBgColor = "bg-blue-50",
  iconColor = "text-blue-600",
  valuePrefix = "",
  valueSuffix = "",
  decimals = 0,
  delay = 0,
  accentColor = "border-l-blue-500",
}: StatCardProps) {
  return (
    <div
      className="bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 p-6 animate-fade-in-up border-l-4 ${accentColor}"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            <CountUpNumber
              value={value}
              prefix={valuePrefix}
              suffix={valueSuffix}
              decimals={decimals}
            />
          </p>
        </div>
        <div className={`w-12 h-12 rounded-lg ${iconBgColor} ${iconColor} flex items-center justify-center`}>
          <Icon size={22} strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}