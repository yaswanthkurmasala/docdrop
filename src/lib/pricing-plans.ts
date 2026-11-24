export interface PlanDefinition {
  id: string;
  name: string;
  usdPrice: string;
  inrAmount: number;
  inrDisplay: string;
  billingPeriod: string;
  tagline: string;
}

export const PRICING_PLANS: Record<string, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free Explorer",
    usdPrice: "$0",
    inrAmount: 0,
    inrDisplay: "₹0",
    billingPeriod: "forever",
    tagline: "Everyday in-browser conversions with zero setup or cloud uploads.",
  },
  quick_pass: {
    id: "quick_pass",
    name: "Quick Pass (48h)",
    usdPrice: "$1.99",
    inrAmount: 99,
    inrDisplay: "₹99",
    billingPeriod: "48 hours",
    tagline: "Got a single paper, tax filing, or thesis? No recurring subscription.",
  },
  pro_monthly: {
    id: "pro_monthly",
    name: "Pro Coffee (Monthly)",
    usdPrice: "$2.99",
    inrAmount: 199,
    inrDisplay: "₹199",
    billingPeriod: "month",
    tagline: "Continuous unlimited conversions for less than a cup of coffee.",
  },
  pro_yearly: {
    id: "pro_yearly",
    name: "Pro Coffee (Annual)",
    usdPrice: "$19.00",
    inrAmount: 999,
    inrDisplay: "₹999",
    billingPeriod: "year",
    tagline: "Full year of unlimited Pro instruments. Save over 58%.",
  },
  lifetime: {
    id: "lifetime",
    name: "Early-Bird Lifetime",
    usdPrice: "$24.00",
    inrAmount: 1499,
    inrDisplay: "₹1,499",
    billingPeriod: "once",
    tagline: "Pay once, own all current & future Pro instruments forever.",
  },
};

export function resolvePlanAmountInr(planName: string, planPrice: string): { amount: number; display: string } {
  const name = (planName || "").toLowerCase();
  const price = (planPrice || "").toLowerCase();

  if (name.includes("lifetime") || price.includes("24") || price.includes("1499")) {
    return { amount: 1499, display: "₹1,499" };
  }
  if (name.includes("year") || name.includes("annual") || price.includes("19") || price.includes("999")) {
    return { amount: 999, display: "₹999" };
  }
  if (name.includes("month") || price.includes("2.99") || price.includes("199")) {
    return { amount: 199, display: "₹199" };
  }
  if (name.includes("quick") || name.includes("48") || price.includes("1.99") || price.includes("99")) {
    return { amount: 99, display: "₹99" };
  }

  // Fallback default
  return { amount: 99, display: "₹99" };
}
