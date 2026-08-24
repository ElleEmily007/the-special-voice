export interface Plan {
  id: string;
  name: string;
  description: string;
  frequency: number;
  /** Free trial length in days for this plan. */
  trialDays: number;
  monthlyPrice: number;
  monthlyPriceId: string;
  highlight?: boolean;
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: "once",
    name: "Once Daily",
    description: "One story a day — the perfect gentle habit.",
    frequency: 1,
    trialDays: 9,
    monthlyPrice: 12.95,
    monthlyPriceId: process.env.STRIPE_PRICE_ONCE_MONTHLY ?? "price_once_monthly",
    features: [
      "1 story delivered daily",
      "9-day free trial at 1x/day",
      "Ringless voicemail — no interruptions",
      "Choose a male or female voice",
      "Choose Old or New Testament",
      "Cancel anytime",
    ],
  },
  {
    id: "twice",
    name: "Twice Daily",
    description: "Twice a day for a deeper journey.",
    frequency: 2,
    trialDays: 6,
    monthlyPrice: 19.95,
    monthlyPriceId: process.env.STRIPE_PRICE_TWICE_MONTHLY ?? "price_twice_monthly",
    highlight: true,
    features: [
      "2 stories delivered daily",
      "6-day free trial at 2x/day",
      "Ringless voicemail — no interruptions",
      "Choose a male or female voice",
      "Choose Old or New Testament",
      "Cancel anytime",
    ],
  },
  {
    id: "thrice",
    name: "Three Times Daily",
    description: "Three times a day for total immersion.",
    frequency: 3,
    trialDays: 3,
    monthlyPrice: 24.95,
    monthlyPriceId: process.env.STRIPE_PRICE_THRICE_MONTHLY ?? "price_thrice_monthly",
    features: [
      "3 stories delivered daily",
      "3-day free trial at 3x/day",
      "Ringless voicemail — no interruptions",
      "Choose a male or female voice",
      "Choose Old or New Testament",
      "Cancel anytime",
    ],
  },
];

export function getPlanById(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}

export function getPriceId(planId: string): string {
  const plan = getPlanById(planId);
  if (!plan) throw new Error(`Plan ${planId} not found`);
  return plan.monthlyPriceId;
}

export function getTrialDays(planId: string): number {
  const plan = getPlanById(planId);
  if (!plan) throw new Error(`Plan ${planId} not found`);
  return plan.trialDays;
}

export function getPlanFrequency(planId: string): number {
  const plan = getPlanById(planId);
  if (!plan) throw new Error(`Plan ${planId} not found`);
  return plan.frequency;
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents);
}
