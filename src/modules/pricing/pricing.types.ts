export interface PricingTier {
  id?: number
  uuid?: string
  name: string
  description?: string
  rateLimit: number
  apiKeyLimit: number
}

export interface UserPlan {
  tierName: string
  rateLimit: number
  apiKeyLimit: number
} 