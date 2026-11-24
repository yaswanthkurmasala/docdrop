export const FREE_TIER_LIMITS = {
  maxFileSizeMb: 50,
  maxPages: 50,
  maxBatchFiles: 10,
};

export const PRO_TIER_LIMITS = {
  maxFileSizeMb: 500,
  maxPages: 1000,
};

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
    usdPrice: "$0.99",
    inrAmount: 49,
    inrDisplay: "₹49",
    billingPeriod: "48 hours",
    tagline: "Got a single paper, tax filing, or thesis? No recurring subscription.",
  },
  pro_monthly: {
    id: "pro_monthly",
    name: "Monthly Pro",
    usdPrice: "$1.99",
    inrAmount: 99,
    inrDisplay: "₹99",
    billingPeriod: "month",
    tagline: "Continuous unlimited conversions for less than a cup of coffee.",
  },
  pro_yearly: {
    id: "pro_yearly",
    name: "Annual Pass",
    usdPrice: "$9.99",
    inrAmount: 499,
    inrDisplay: "₹499",
    billingPeriod: "year",
    tagline: "Full year of unlimited Pro instruments. Save 58%.",
  },
  lifetime: {
    id: "lifetime",
    name: "Lifetime Pass",
    usdPrice: "$14.99",
    inrAmount: 999,
    inrDisplay: "₹999",
    billingPeriod: "once",
    tagline: "Pay once, own all current & future Pro instruments forever.",
  },
};

export function resolvePlanAmountInr(planName: string, planPrice: string): { amount: number; display: string } {
  const name = (planName || "").toLowerCase();
  const price = (planPrice || "").toLowerCase().replace(/,/g, "").trim();

  // Check highest / exact tiers first so "499" never falsely matches "49" and "999" never falsely matches "99"
  if (name.includes("lifetime") || price.includes("999") || price.includes("14.99") || price === "$15") {
    return { amount: 999, display: "₹999" };
  }
  if (name.includes("year") || name.includes("annual") || price.includes("499") || price.includes("9.99")) {
    return { amount: 499, display: "₹499" };
  }
  if (name.includes("month") || price.includes("1.99") || price === "₹99" || price === "99") {
    return { amount: 99, display: "₹99" };
  }
  if (name.includes("quick") || name.includes("48") || price.includes("0.99") || price.includes("49")) {
    return { amount: 49, display: "₹49" };
  }

  return { amount: 49, display: "₹49" };
}
