/** Categories aligned with admin AddCar form */
export const CAR_CATEGORY_OPTIONS = [
  "Sedan",
  "SUV",
  "Sports",
  "Coupe",
  "Hatchback",
  "Luxury",
];

export const PRICE_BUCKET_OPTIONS = [
  { value: "", label: "Any price" },
  { value: "lt5000", label: "Under Rs 5,000" },
  { value: "5k10k", label: "Rs 5,000 – 10,000" },
  { value: "10k20k", label: "Rs 10,000 – 20,000" },
  { value: "gt20k", label: "Above Rs 20,000" },
];

export const TRANSMISSION_OPTIONS = [
  { value: "", label: "Any" },
  { value: "automatic", label: "Automatic" },
  { value: "manual", label: "Manual" },
];

export function getDailyRate(car) {
  const n = Number(car?.dailyRate ?? car?.price ?? car?.pricePerDay);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Client-side filter for car listings (search, category, transmission, price band).
 */
export function filterCars(cars, filters) {
  if (!Array.isArray(cars)) return [];
  const {
    search = "",
    category = "",
    transmission = "",
    priceBucket = "",
  } = filters || {};

  const q = String(search).trim().toLowerCase();

  return cars.filter((car) => {
    if (q) {
      const haystack = `${car.make || ""} ${car.model || ""} ${car.name || ""}`
        .toLowerCase()
        .trim();
      if (!haystack.includes(q)) return false;
    }

    if (category) {
      const cat = String(car.category || car.type || "").toLowerCase();
      if (cat !== String(category).toLowerCase()) return false;
    }

    if (transmission === "automatic") {
      const t = String(car.transmission || "").toLowerCase();
      if (!t.includes("auto")) return false;
    } else if (transmission === "manual") {
      const t = String(car.transmission || "").toLowerCase();
      if (!t.includes("manual")) return false;
    }

    const rate = getDailyRate(car);
    if (priceBucket === "lt5000" && rate >= 5000) return false;
    if (priceBucket === "5k10k" && (rate < 5000 || rate > 10000)) return false;
    if (priceBucket === "10k20k" && (rate < 10000 || rate > 20000)) return false;
    if (priceBucket === "gt20k" && rate <= 20000) return false;

    return true;
  });
}
