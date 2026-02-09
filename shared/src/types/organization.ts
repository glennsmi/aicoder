import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

/**
 * Organization Tiers
 */
export type OrganizationTier = 'free' | 'team' | 'enterprise';

/**
 * Billing Cycle
 */
export type BillingCycle = 'monthly' | 'annual';

/**
 * User Role within an Organization
 */
export type OrganizationRole = 'admin' | 'team_manager' | 'member';

/**
 * Member Status
 */
export type MemberStatus = 'invited' | 'active' | 'suspended';

/**
 * Billing Plan Configuration
 */
export interface BillingPlan {
  seats: number; // Total allocated seats
  usedSeats: number; // Currently used seats
  pricePerSeat: number; // Price per seat in USD
  baseFee: number; // Base monthly/annual fee
  billingCycle: BillingCycle;
}

/**
 * Organization Settings
 */
export interface OrganizationReportSettings {
  /**
   * If true, exported charts/reports should use organization branding (white-label).
   * If false/undefined, use Fueld branding.
   */
  whiteLabelBranding?: boolean;
}

export interface OrganizationSettings {
  apiIntegrations: string[]; // List of enabled integration provider IDs
  dataRetentionDays: number; // Number of days to retain usage data
  allowMemberInvites?: boolean; // Whether members can invite others
  requireTwoFactor?: boolean; // Whether 2FA is required
  reports?: OrganizationReportSettings;
}

/**
 * Organization Document
 */
export interface Organization {
  id: string;
  name: string;
  tier: OrganizationTier;
  billingPlan: BillingPlan;
  settings: OrganizationSettings;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  ownerId: string; // User ID of the organization owner
}

/**
 * Organization Member
 */
export interface OrganizationMember {
  userId: string;
  email: string;
  displayName?: string;
  role: OrganizationRole;
  teamId?: string; // For team_manager assignment
  invitedAt: Date | Timestamp;
  joinedAt?: Date | Timestamp;
  status: MemberStatus;
  invitedBy?: string; // User ID who sent the invitation
}

/**
 * Zod Schemas for Validation
 */

export const BillingPlanSchema = z.object({
  seats: z.number().int().positive(),
  usedSeats: z.number().int().min(0),
  pricePerSeat: z.number().min(0),
  baseFee: z.number().min(0),
  billingCycle: z.enum(['monthly', 'annual']),
});

export const OrganizationSettingsSchema = z.object({
  apiIntegrations: z.array(z.string()),
  dataRetentionDays: z.number().int().positive(),
  allowMemberInvites: z.boolean().optional(),
  requireTwoFactor: z.boolean().optional(),
  reports: z.object({
    whiteLabelBranding: z.boolean().optional(),
  }).optional(),
});

export const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  tier: z.enum(['free', 'team', 'enterprise']),
  billingPlan: BillingPlanSchema,
  settings: OrganizationSettingsSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  ownerId: z.string(),
});

export const OrganizationMemberSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  displayName: z.string().optional(),
  role: z.enum(['admin', 'team_manager', 'member']),
  teamId: z.string().optional(),
  invitedAt: z.date(),
  joinedAt: z.date().optional(),
  status: z.enum(['invited', 'active', 'suspended']),
  invitedBy: z.string().optional(),
});

/**
 * Helper type for creating new organizations
 */
export type CreateOrganizationInput = Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Helper type for updating organizations
 */
export type UpdateOrganizationInput = Partial<Omit<Organization, 'id' | 'createdAt' | 'ownerId'>>;

