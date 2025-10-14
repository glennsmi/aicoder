import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';
import { OrganizationTier, BillingCycle } from './organization';

/**
 * Subscription Status
 */
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete';

/**
 * Pricing Tier Details
 */
export interface PricingTier {
  tier: OrganizationTier;
  name: string;
  description: string;
  baseFee: number; // Monthly base fee in USD
  pricePerSeat: number; // Per seat monthly price in USD
  maxUsers: number | null; // null = unlimited
  features: PricingFeature[];
  dataRetentionDays: number;
  support: 'community' | 'email' | 'priority' | 'dedicated';
}

/**
 * Features included in pricing tiers
 */
export interface PricingFeature {
  id: string;
  name: string;
  description: string;
  included: boolean;
}

/**
 * Subscription Document
 */
export interface Subscription {
  organizationId: string;
  stripeCustomerId: string;
  stripeSubscriptionId?: string;
  status: SubscriptionStatus;
  tier: OrganizationTier;
  seats: number;
  billingCycle: BillingCycle;
  currentPeriodStart: Date | Timestamp;
  currentPeriodEnd: Date | Timestamp;
  cancelAtPeriodEnd: boolean;
  trialEnd?: Date | Timestamp;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}

/**
 * Invoice Record
 */
export interface Invoice {
  id: string;
  organizationId: string;
  stripeInvoiceId: string;
  amount: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  periodStart: Date | Timestamp;
  periodEnd: Date | Timestamp;
  dueDate?: Date | Timestamp;
  paidAt?: Date | Timestamp;
  invoiceUrl?: string;
  invoicePdfUrl?: string;
  createdAt: Date | Timestamp;
}

/**
 * Usage-based Charges
 */
export interface UsageCharge {
  organizationId: string;
  period: string; // YYYY-MM format
  totalCost: number;
  totalTokens: number;
  breakdown: UsageChargeBreakdown[];
  calculatedAt: Date | Timestamp;
}

export interface UsageChargeBreakdown {
  userId: string;
  userEmail: string;
  cost: number;
  tokens: number;
  models: Record<string, { tokens: number; cost: number }>;
}

/**
 * Zod Schemas
 */

export const SubscriptionSchema = z.object({
  organizationId: z.string(),
  stripeCustomerId: z.string(),
  stripeSubscriptionId: z.string().optional(),
  status: z.enum(['active', 'past_due', 'canceled', 'trialing', 'incomplete']),
  tier: z.enum(['free', 'team', 'enterprise']),
  seats: z.number().int().positive(),
  billingCycle: z.enum(['monthly', 'annual']),
  currentPeriodStart: z.date(),
  currentPeriodEnd: z.date(),
  cancelAtPeriodEnd: z.boolean(),
  trialEnd: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const InvoiceSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  stripeInvoiceId: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: z.enum(['draft', 'open', 'paid', 'void', 'uncollectible']),
  periodStart: z.date(),
  periodEnd: z.date(),
  dueDate: z.date().optional(),
  paidAt: z.date().optional(),
  invoiceUrl: z.string().url().optional(),
  invoicePdfUrl: z.string().url().optional(),
  createdAt: z.date(),
});

/**
 * Predefined Pricing Tiers
 */
export const PRICING_TIERS: Record<OrganizationTier, PricingTier> = {
  free: {
    tier: 'free',
    name: 'Free Individual',
    description: 'Perfect for solo developers tracking their AI coding costs',
    baseFee: 0,
    pricePerSeat: 0,
    maxUsers: 1,
    features: [
      { id: 'csv_upload', name: 'Manual CSV Upload', description: 'Upload usage data manually', included: true },
      { id: 'basic_analytics', name: 'Basic Analytics', description: 'View your usage trends', included: true },
      { id: 'data_retention_90', name: '90-day Data Retention', description: 'Keep 3 months of history', included: true },
      { id: 'api_integration', name: 'API Integrations', description: 'Automatic data sync', included: false },
      { id: 'team_features', name: 'Team Management', description: 'Manage multiple users', included: false },
      { id: 'advanced_analytics', name: 'Advanced Analytics', description: 'Deeper insights', included: false },
    ],
    dataRetentionDays: 90,
    support: 'community',
  },
  team: {
    tier: 'team',
    name: 'Team',
    description: 'For teams collaborating with AI coding assistants',
    baseFee: 49,
    pricePerSeat: 12,
    maxUsers: 50,
    features: [
      { id: 'csv_upload', name: 'Manual CSV Upload', description: 'Upload usage data manually', included: true },
      { id: 'basic_analytics', name: 'Basic Analytics', description: 'View your usage trends', included: true },
      { id: 'unlimited_retention', name: 'Unlimited Data Retention', description: 'Keep all your history', included: true },
      { id: 'api_integration', name: 'API Integrations', description: 'Automatic data sync', included: true },
      { id: 'team_features', name: 'Team Management', description: 'Manage multiple users', included: true },
      { id: 'team_analytics', name: 'Team Analytics', description: 'Track team performance', included: true },
      { id: 'role_based_access', name: 'Role-Based Access', description: 'Admin, Manager, Member roles', included: true },
      { id: 'export_reports', name: 'Export Reports', description: 'PDF, CSV, Excel exports', included: true },
      { id: 'priority_support', name: 'Priority Support', description: 'Email support with priority', included: true },
      { id: 'advanced_analytics', name: 'Advanced Analytics', description: 'Deeper insights', included: false },
      { id: 'custom_integrations', name: 'Custom Integrations', description: 'Build your own connectors', included: false },
    ],
    dataRetentionDays: -1, // Unlimited
    support: 'priority',
  },
  enterprise: {
    tier: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations with advanced needs',
    baseFee: 199,
    pricePerSeat: 8,
    maxUsers: null, // Unlimited
    features: [
      { id: 'csv_upload', name: 'Manual CSV Upload', description: 'Upload usage data manually', included: true },
      { id: 'basic_analytics', name: 'Basic Analytics', description: 'View your usage trends', included: true },
      { id: 'unlimited_retention', name: 'Unlimited Data Retention', description: 'Keep all your history', included: true },
      { id: 'api_integration', name: 'API Integrations', description: 'Automatic data sync', included: true },
      { id: 'team_features', name: 'Team Management', description: 'Manage multiple users', included: true },
      { id: 'team_analytics', name: 'Team Analytics', description: 'Track team performance', included: true },
      { id: 'role_based_access', name: 'Role-Based Access', description: 'Admin, Manager, Member roles', included: true },
      { id: 'export_reports', name: 'Export Reports', description: 'PDF, CSV, Excel exports', included: true },
      { id: 'advanced_analytics', name: 'Advanced Analytics', description: 'Forecasting, trends, budgets', included: true },
      { id: 'custom_integrations', name: 'Custom Integrations', description: 'Build your own connectors', included: true },
      { id: 'dedicated_support', name: 'Dedicated Support', description: 'Personal support contact', included: true },
      { id: 'sla', name: 'SLA Guarantee', description: '99.9% uptime guarantee', included: true },
      { id: 'audit_logs', name: 'Audit Logs', description: 'Complete activity tracking', included: true },
    ],
    dataRetentionDays: -1, // Unlimited
    support: 'dedicated',
  },
};

/**
 * Calculate monthly cost for a given tier and seat count
 */
export function calculateMonthlyCost(tier: OrganizationTier, seats: number): number {
  const pricing = PRICING_TIERS[tier];
  return pricing.baseFee + (pricing.pricePerSeat * seats);
}

/**
 * Calculate annual cost (typically with discount)
 */
export function calculateAnnualCost(tier: OrganizationTier, seats: number, discountPercent: number = 20): number {
  const monthlyCost = calculateMonthlyCost(tier, seats);
  const annualCost = monthlyCost * 12;
  return annualCost * (1 - discountPercent / 100);
}

