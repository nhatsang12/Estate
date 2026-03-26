export type UserRole = "user" | "provider" | "admin";

export type KycStatus = "pending" | "submitted" | "reviewing" | "verified" | "rejected";

export type SubscriptionPlan = 'Free' | 'Pro' | 'ProPlus';
export interface KycExtractedData {
  front?: Record<string, unknown> | null;
  back?: Record<string, unknown> | null;
  merged?: Record<string, unknown> | null;
  raw?: Record<string, unknown> | null;
  ocrErrors?: Array<{ side?: string; message?: string }>;
  [key: string]: unknown;
}

export interface KycComparisonResult {
  checks?: Array<Record<string, unknown>>;
  score?: number;
  isMatch?: boolean;
  decisionNotes?: string;
  decidedAt?: string;
  [key: string]: unknown;
}

export interface SubscriptionInfo {
  plan: SubscriptionPlan;
  expiryDate?: string;
  isActive?: boolean;
  createdAt?: string;

}

export interface User {

  _id: string;
  name: string;
  email: string;
  role: UserRole;
  address: string;
  phone?: string | null;
  avatar?: string | null;
  isVerified?: boolean;
  kycStatus?: KycStatus;
  kycDocuments?: string[];
  kycExtractedData?: KycExtractedData | null;
  kycComparisonResult?: KycComparisonResult | null;
  kycRejectionReason?: string;
  subscription?: SubscriptionInfo;
  subscriptionPlan?: SubscriptionPlan;
  subscriptionStartedAt?: string;
  subscriptionExpiresAt?: string;
  listingsCount?: number;
  createdAt?: string;
  updatedAt?: string;
}
