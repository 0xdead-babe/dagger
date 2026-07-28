import React from "react";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  accentValue?: boolean;
}

export default function StatCard({ icon, label, value, subtitle, accentValue }: StatCardProps) {
  return (
    <div className="card px-4 py-3.5">
      <div className="flex items-center justify-between">
        <div className="w-[32px] h-[32px] rounded-[8px] bg-surface-raised flex items-center justify-center text-[#9C9184]">
          {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 16 }) : icon}
        </div>
        {subtitle && (
          <div className="text-[11px] text-text-secondary self-center">
            {subtitle}
          </div>
        )}
      </div>
      <div className="mt-3">
        <div className="text-[11.5px] text-text-secondary">
          {label}
        </div>
        <div className={`text-[22px] font-bold tracking-tight leading-none mt-0.5 ${accentValue ? "text-accent-text" : "text-text-primary"}`}>
          {value}
        </div>
      </div>
    </div>
  );
}
