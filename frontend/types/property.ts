import type { User } from "@/types/user";

export type PropertyType = "apartment" | "house" | "villa" | "studio" | "office";

export type PropertyStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "available"
  | "rented"
  | "sold";

export interface PropertyLocation {
  type: "Point";
  coordinates: [number, number];
}

export type PropertyOwner = Pick<User, "_id" | "name" | "email" | "phone" | "avatar"> | string;

export interface Property {
  _id: string;
  title: string;
  description: string;
  price: number;
  address: string;
  location: PropertyLocation;
  type: PropertyType;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  furnished: boolean;
  yearBuilt?: number;
  amenities: string[];
  images: string[];
  ownershipDocuments?: string[];
  ownerId: PropertyOwner;
  agentId?: PropertyOwner | null;
  status: PropertyStatus;
  rejectionReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PropertyFilters {
  search?: string;
  locationText?: string;
  priceMin?: number;
  priceMax?: number;
  areaMin?: number;
  areaMax?: number;
  type?: PropertyType;
  bedrooms?: number;
  bathrooms?: number;
  furnished?: boolean;
  ownerId?: string;
  status?: PropertyStatus;
  sort?: string;
  limit?: number;
  page?: number;
}

