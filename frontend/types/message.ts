import type { UserRole } from "@/types/user";

export type ChatMessageType = "text" | "image";

export interface MessageUser {
  _id: string;
  name: string;
  avatar?: string | null;
  role?: UserRole;
}

export interface PropertySnapshot {
  propertyId?: string;
  title?: string;
  address?: string;
  price?: number;
  description?: string;
  imageUrl?: string;
}

export interface ChatMessage {
  _id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  sender?: MessageUser | null;
  receiver?: MessageUser | null;
  messageType: ChatMessageType;
  content?: string;
  imageUrl?: string;
  propertySnapshot?: PropertySnapshot | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface ConversationSummary {
  conversationId: string;
  participant: MessageUser | null;
  unreadCount: number;
  updatedAt: string;
  lastMessage: ChatMessage;
}
