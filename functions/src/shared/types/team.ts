import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

/**
 * Team Document
 */
export interface Team {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  managerId: string; // User ID of the team manager
  memberIds: string[]; // Array of user IDs who are team members
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}

/**
 * Zod Schema for Team Validation
 */
export const TeamSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  managerId: z.string(),
  memberIds: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Helper type for creating new teams
 */
export type CreateTeamInput = Omit<Team, 'id' | 'createdAt' | 'updatedAt' | 'memberIds'> & {
  memberIds?: string[];
};

/**
 * Helper type for updating teams
 */
export type UpdateTeamInput = Partial<Omit<Team, 'id' | 'organizationId' | 'createdAt'>>;

/**
 * Team member assignment
 */
export interface TeamMemberAssignment {
  teamId: string;
  userId: string;
  assignedAt: Date | Timestamp;
  assignedBy: string; // User ID who made the assignment
}

