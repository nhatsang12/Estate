import React from "react";
import Image from "next/image";
import { BedDouble, Bath, Ruler } from "lucide-react";
import type { Property } from "@/types/property";

interface RecommendationCardProps {
  property: Property;
  onSelect?: (property: Property) => void;
}

const RecommendationCard = React.forwardRef<HTMLDivElement, RecommendationCardProps>(
  ({ property, onSelect }, ref) => {
    const imageUrl = property.images?.[0] || "/placeholder-property.jpg";

    return (
      <div
        ref={ref}
        onClick={() => onSelect?.(property)}
        className="group listing-card overflow-hidden p-3 cursor-pointer"
      >
        <div className="relative h-48 rounded-2xl overflow-hidden bg-background-light">
          <Image
            src={imageUrl}
            alt={property.title}
            fill
            className="object-cover transition-transform duration-normal group-hover:scale-105"
          />
          <div className="absolute top-2 right-2 rounded-full border border-boundary bg-surface px-3 py-1 text-sm font-semibold text-text-primary shadow-sm backdrop-blur-md">
            {new Intl.NumberFormat("vi-VN", {
              style: "currency",
              currency: "VND",
            }).format(property.price)}
          </div>
        </div>
        <div className="pt-4 pb-2 px-1">
          <h3 className="font-semibold text-text-primary line-clamp-2 mb-2">{property.title}</h3>
          <p className="text-xs text-text-secondary mb-3 line-clamp-1">{property.address}</p>
           <div className="flex gap-4 text-xs text-text-secondary">
             {property.bedrooms !== undefined && <span className="flex items-center gap-1"><BedDouble size={14} /> {property.bedrooms}</span>}
             {property.bathrooms !== undefined && <span className="flex items-center gap-1"><Bath size={14} /> {property.bathrooms}</span>}
             {property.area !== undefined && <span className="flex items-center gap-1"><Ruler size={14} /> {property.area} m²</span>}
           </div>
        </div>
      </div>
    );
  }
);

RecommendationCard.displayName = "RecommendationCard";

export default RecommendationCard;
