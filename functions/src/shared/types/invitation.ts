import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';
import { OrganizationRole } from './organization';

/**
 * Invitation Status
 */
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

/**
 * Invitation Document
 */
export interface Invitation {
  id: string;
  organizationId: string;
  email: string;
  role: OrganizationRole;
  teamId?: string; // Optional team assignment
  invitedBy: string; // User ID who sent the invitation
  token: string; // Unique token for the invitation link
  expiresAt: Date | Timestamp;
  status: InvitationStatus;
  acceptedBy?: string; // User ID who accepted (if accepted)
  acceptedAt?: Date | Timestamp;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}

/**
 * Zod Schema for Invitation
 */
export const InvitationSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'team_manager', 'member']),
  teamId: z.string().optional(),
  invitedBy: z.string(),
  token: z.string(),
  expiresAt: z.date(),
  status: z.enum(['pending', 'accepted', 'expired', 'revoked']),
  acceptedBy: z.string().optional(),
  acceptedAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Helper type for creating invitations
 */
export type CreateInvitationInput = {
  organizationId: string;
  email: string;
  role: OrganizationRole;
  teamId?: string;
  invitedBy: string;
};

/**
 * Invitation email data
 */
export interface InvitationEmailData {
  invitationId: string;
  organizationName: string;
  inviterName: string;
  inviterEmail: string;
  recipientEmail: string;
  role: OrganizationRole;
  teamName?: string;
  invitationUrl: string;
  expiresAt: Date;
}

