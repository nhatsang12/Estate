import { useState } from "react";
import type { FormEvent } from "react";
import {
  ChevronDown,
  ChevronUp,
  LoaderCircle,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { ApiError } from "@/services/apiClient";
import { propertyService } from "@/services/propertyService";
import type { Property, PropertyFilters, PropertyType } from "@/types/property";

interface AdvancedSearchBarProps {
  onResults: (properties: Property[], appliedFilters: PropertyFilters) => void;
  onError: (message: string | null) => void;
  onLoadingChange: (loading: boolean) => void;
}

function parseNumber(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildUserFriendlyError(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Search failed. Please try again.";
}

export default function AdvancedSearchBar({
  onResults,
  onError,
  onLoadingChange,
}: AdvancedSearchBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [keyword, setKeyword] = useState("");
  const [locationText, setLocationText] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [propertyType, setPropertyType] = useState<PropertyType | "">("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [furnishedOnly, setFurnishedOnly] = useState(false);

  const executeSearch = async (filters: PropertyFilters) => {
    setIsSubmitting(true);
    onLoadingChange(true);
    onError(null);

    try {
      const response = await propertyService.getAllProperties({
        ...filters,
        sort: "-createdAt",
        limit: 24,
      });
      onResults(response.data.properties, filters);
    } catch (error) {
      onError(buildUserFriendlyError(error));
    } finally {
      setIsSubmitting(false);
      onLoadingChange(false);
    }
  };

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const filters: PropertyFilters = {
      search: keyword.trim() || undefined,
      locationText: locationText.trim() || undefined,
      priceMin: parseNumber(priceMin),
      priceMax: parseNumber(priceMax),
      type: propertyType || undefined,
      bedrooms: parseNumber(bedrooms),
      bathrooms: parseNumber(bathrooms),
      furnished: furnishedOnly ? true : undefined,
    };

    await executeSearch(filters);
  };

  const handleReset = async () => {
    setKeyword("");
    setLocationText("");
    setPriceMin("");
    setPriceMax("");
    setPropertyType("");
    setBedrooms("");
    setBathrooms("");
    setFurnishedOnly(false);
    onError(null);
    await executeSearch({});
  };

  return (
    <form onSubmit={handleSearch} className="glass-panel border border-slate-200 p-3 sm:p-4 sm:p-5">
      <style jsx>{`
        .glass-panel-custom {
          background-color: rgba(255, 255, 255, 0.65);
          border-color: rgba(255, 255, 255, 0.6);
        }
      `}</style>
      <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <label className="glass-input-wrapper">
          <Search size={16} className="text-slate-600 shrink-0" />
          <input
            type="text"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Search by title, address, or amenities"
            className="glass-input"
          />
        </label>

        <button
          type="button"
          className="glass-button justify-center"
          onClick={() => setIsExpanded((prev) => !prev)}
          style={{
            transitionDuration: "var(--transition-duration-normal)",
            transitionTimingFunction: "var(--transition-easing)",
          }}
        >
          <SlidersHorizontal size={16} />
          Advanced
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        <button 
          type="submit" 
          className="glass-button-primary justify-center" 
          disabled={isSubmitting}
          style={{
            transitionDuration: "var(--transition-duration-normal)",
            transitionTimingFunction: "var(--transition-easing)",
          }}
        >
          {isSubmitting ? <LoaderCircle size={16} className="animate-spin" /> : "Search"}
        </button>
      </div>

      {isExpanded ? (
        <div className="mt-3 sm:mt-4 grid gap-2 sm:gap-3 border-t border-slate-200 pt-3 sm:pt-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Location</span>
            <span className="glass-input-wrapper">
              <input
                type="text"
                className="glass-input"
                placeholder="District, city..."
                value={locationText}
                onChange={(event) => setLocationText(event.target.value)}
              />
            </span>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Property Type</span>
            <span className="glass-input-wrapper">
              <select
                className="glass-input"
                value={propertyType}
                onChange={(event) => setPropertyType(event.target.value as PropertyType | "")}
              >
                <option value="">All types</option>
                <option value="apartment">Apartment</option>
                <option value="house">House</option>
                <option value="villa">Villa</option>
                <option value="studio">Studio</option>
                <option value="office">Office</option>
              </select>
            </span>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Min Price</span>
            <span className="glass-input-wrapper">
              <input
                type="number"
                min={0}
                className="glass-input"
                placeholder="0"
                value={priceMin}
                onChange={(event) => setPriceMin(event.target.value)}
              />
            </span>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Max Price</span>
            <span className="glass-input-wrapper">
              <input
                type="number"
                min={0}
                className="glass-input"
                placeholder="500000"
                value={priceMax}
                onChange={(event) => setPriceMax(event.target.value)}
              />
            </span>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Bedrooms</span>
            <span className="glass-input-wrapper">
              <input
                type="number"
                min={0}
                className="glass-input"
                placeholder="Any"
                value={bedrooms}
                onChange={(event) => setBedrooms(event.target.value)}
              />
            </span>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Bathrooms</span>
            <span className="glass-input-wrapper">
              <input
                type="number"
                min={0}
                className="glass-input"
                placeholder="Any"
                value={bathrooms}
                onChange={(event) => setBathrooms(event.target.value)}
              />
            </span>
          </label>

          <label className="mt-3 sm:mt-5 inline-flex items-center gap-2 text-sm text-slate-900">
            <input
              type="checkbox"
              checked={furnishedOnly}
              onChange={(event) => setFurnishedOnly(event.target.checked)}
              className="h-4 w-4 rounded border-slate-200 text-indigo-800 focus:ring-indigo-400"
            />
            Furnished only
          </label>

          <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-start sm:items-end justify-end gap-2 sm:col-span-1 lg:col-span-1">
            <button 
              type="button" 
              className="glass-button w-full sm:w-auto" 
              onClick={handleReset} 
              disabled={isSubmitting}
              style={{
                transitionDuration: "var(--transition-duration-normal)",
                transitionTimingFunction: "var(--transition-easing)",
              }}
            >
              Reset
            </button>
            <button 
              type="submit" 
              className="glass-button-primary w-full sm:w-auto" 
              disabled={isSubmitting}
              style={{
                transitionDuration: "var(--transition-duration-normal)",
                transitionTimingFunction: "var(--transition-easing)",
              }}
            >
              {isSubmitting ? <LoaderCircle size={16} className="animate-spin" /> : "Apply Filters"}
            </button>
          </div>
        </div>
      ) : null}
    </form>
  );
}
