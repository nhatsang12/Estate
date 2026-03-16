import React from "react";
import { CheckCircle } from "lucide-react";
import type { SubscriptionPlan } from "@/services/paymentService";

interface PlanCardProps {
  plan: SubscriptionPlan;
  name: string;
  price: string;
  features: string[];
  onSelect: (plan: SubscriptionPlan) => void;
  isSelected?: boolean;
  isCurrentPlan?: boolean;
}

export default function PlanCard({
  plan,
  name,
  price,
  features,
  onSelect,
  isSelected = false,
  isCurrentPlan = false,
}: PlanCardProps) {
  return (
    <div
      className={`glass-panel overflow-hidden transition-all duration-normal ${
        isSelected || isCurrentPlan
          ? "border-primary-light shadow-md scale-105"
          : "border-boundary hover:border-primary-light/50 hover:shadow-sm"
      }`}
    >
       {isCurrentPlan && (
         <div className="bg-emerald-500/90 text-white px-4 py-2 text-sm font-semibold backdrop-blur-sm text-center flex items-center gap-2 justify-center">
           <CheckCircle size={16} />
           Gói hiện tại
         </div>
       )}

      <div className="p-6">
        <h3 className="text-xl font-bold text-text-primary mb-2">{name}</h3>
        <p className="text-3xl font-bold text-primary-dark mb-4">{price}</p>

         <ul className="space-y-3 mb-6">
           {features.map((feature, idx) => (
             <li key={idx} className="flex items-start gap-2 text-sm text-text-secondary">
               <CheckCircle size={18} className="text-emerald-500 mt-0.5 shrink-0" />
               <span>{feature}</span>
             </li>
           ))}
         </ul>

        <button
          onClick={() => onSelect(plan)}
          disabled={isCurrentPlan}
          className={`w-full py-2.5 rounded-xl font-semibold transition-all duration-normal ${
            isSelected || isCurrentPlan
              ? "bg-primary-dark text-white shadow-md hover:bg-primary-light"
              : "bg-surface border border-boundary text-text-secondary hover:bg-white hover:text-text-primary"
          } ${isCurrentPlan ? "opacity-70 cursor-not-allowed" : ""}`}
        >
          {isCurrentPlan ? "Gói hiện tại" : "Chọn gói này"}
        </button>
      </div>
    </div>
  );
}
