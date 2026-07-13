import React from "react";
import { Search } from "lucide-react";
import {
  CAR_CATEGORY_OPTIONS,
  PRICE_BUCKET_OPTIONS,
  TRANSMISSION_OPTIONS,
} from "../utils/carFilters";

const chipBase =
  "shrink-0 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors border whitespace-nowrap";
const chipInactive =
  "bg-white text-gray-700 border-gray-300 hover:border-orange-500/40 hover:bg-orange-50/80";
const chipActive = "bg-orange-500/20 text-orange-300 border-orange-500/60";

const selectClass =
  "rounded-xl border border-gray-300 bg-white px-2 py-2 text-xs text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 sm:px-3 sm:text-sm";

const CarFiltersBar = ({
  compact = false,
  className = "",
  search,
  onSearchChange,
  category,
  onCategoryChange,
  transmission,
  onTransmissionChange,
  priceBucket,
  onPriceBucketChange,
}) => {
  const pad = compact ? "p-3 sm:p-4" : "p-4 sm:p-5";

  return (
    <div
      className={`mb-8 w-full rounded-2xl border border-gray-200/80 bg-slate-50/50 ${pad} backdrop-blur-sm shadow-lg shadow-black/20 sm:mb-10 ${className}`}
    >
      {/* One toolbar line on lg+: search | type chips (scroll) | selects. Stacks on small screens. */}
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-nowrap lg:items-center lg:gap-3">
        <div className="relative min-w-0 shrink-0 lg:w-52 xl:w-64">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 sm:left-3"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search make, model…"
            className="w-full rounded-xl border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 sm:pl-10 sm:pr-4"
            autoComplete="off"
            aria-label="Search cars by name"
          />
        </div>

        <div
          className="flex min-h-10 min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-0.5 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-600"
          aria-label="Filter by vehicle type"
        >
          <span className="sr-only">Vehicle type</span>
          <button
            type="button"
            onClick={() => onCategoryChange("")}
            className={`${chipBase} ${!category ? chipActive : chipInactive}`}
          >
            All
          </button>
          {CAR_CATEGORY_OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onCategoryChange(c)}
              className={`${chipBase} ${
                category === c ? chipActive : chipInactive
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="flex w-full shrink-0 flex-col gap-2 min-[400px]:flex-row lg:w-auto lg:gap-2">
          <label className="sr-only" htmlFor="transmission-filter">
            Transmission
          </label>
          <select
            id="transmission-filter"
            value={transmission}
            onChange={(e) => onTransmissionChange(e.target.value)}
            className={`${selectClass} min-w-0 min-[400px]:flex-1 lg:w-36 xl:w-40`}
            aria-label="Transmission"
          >
            {TRANSMISSION_OPTIONS.map((opt) => (
              <option key={opt.value || "any"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="price-filter">
            Price per day
          </label>
          <select
            id="price-filter"
            value={priceBucket}
            onChange={(e) => onPriceBucketChange(e.target.value)}
            className={`${selectClass} min-w-0 min-[400px]:flex-1 lg:w-44 xl:w-48`}
            aria-label="Price per day"
          >
            {PRICE_BUCKET_OPTIONS.map((opt) => (
              <option key={opt.value || "any-price"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default CarFiltersBar;
