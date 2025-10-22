/**
 * Stripe utility functions and client initialization
 */

import Stripe from 'stripe'

// Lazy Stripe client initialization
let stripeInstance: Stripe | null = null

export function getStripeClient(): Stripe {
  if (!stripeInstance) {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set')
    }
    stripeInstance = new Stripe(stripeSecretKey, {
      apiVersion: '2025-09-30.clover'
    })
  }
  return stripeInstance
}

// Code name to internal tier mapping
export const CODE_NAME_TO_TIER: Record<string, string> = {
  'novice': 'free_individual',
  'apprentice': 'team_apprentice',
  'sensei': 'team_sensei',
  'master': 'team_master',
  'grandmaster': 'enterprise'
}

export const TIER_TO_CODE_NAME: Record<string, string> = {
  'free_individual': 'novice',
  'team_apprentice': 'apprentice',
  'team_sensei': 'sensei',
  'team_master': 'master',
  'enterprise': 'grandmaster'
}

/**
 * Determine internal tier from Stripe price ID
 */
export function determineTierFromPrice(priceId: string): string {
  // Map price IDs to tiers
  const priceToTier: Record<string, string> = {
    // Apprentice
    [process.env.STRIPE_PRICE_APPRENTICE_MONTHLY || '']: 'team_apprentice',
    [process.env.STRIPE_PRICE_APPRENTICE_ANNUAL || '']: 'team_apprentice',
    
    // Sensei
    [process.env.STRIPE_PRICE_SENSEI_MONTHLY || '']: 'team_sensei',
    [process.env.STRIPE_PRICE_SENSEI_ANNUAL || '']: 'team_sensei',
    
    // Master
    [process.env.STRIPE_PRICE_MASTER_MONTHLY || '']: 'team_master',
    [process.env.STRIPE_PRICE_MASTER_ANNUAL || '']: 'team_master',
    
    // Grandmaster
    [process.env.STRIPE_PRICE_GRANDMASTER_MONTHLY || '']: 'enterprise',
    [process.env.STRIPE_PRICE_GRANDMASTER_ANNUAL || '']: 'enterprise'
  }

  return priceToTier[priceId] || 'free_individual'
}

/**
 * Determine code name from Stripe price ID
 */
export function getCodeNameFromPrice(priceId: string): string {
  const tier = determineTierFromPrice(priceId)
  return TIER_TO_CODE_NAME[tier] || 'novice'
}

/**
 * Determine tier from code name
 */
export function determineTierFromCodeName(codeName: string): string {
  return CODE_NAME_TO_TIER[codeName.toLowerCase()] || 'free_individual'
}

/**
 * Get code name from tier
 */
export function getCodeNameFromTier(tier: string): string {
  return TIER_TO_CODE_NAME[tier] || 'novice'
}

/**
 * Get price ID from code name and billing cycle
 */
export function getPriceIdFromCodeName(
  codeName: string,
  billingCycle: 'monthly' | 'annual'
): string {
  const envKey = `STRIPE_PRICE_${codeName.toUpperCase()}_${billingCycle.toUpperCase()}`
  return process.env[envKey] || ''
}

/**
 * Get billing cycle from price ID
 */
export function getBillingCycleFromPrice(priceId: string): 'monthly' | 'annual' {
  // Check if price ID is in annual price IDs
  const annualPriceIds = [
    process.env.STRIPE_PRICE_APPRENTICE_ANNUAL,
    process.env.STRIPE_PRICE_SENSEI_ANNUAL,
    process.env.STRIPE_PRICE_MASTER_ANNUAL,
    process.env.STRIPE_PRICE_GRANDMASTER_ANNUAL
  ]

  return annualPriceIds.includes(priceId) ? 'annual' : 'monthly'
}

