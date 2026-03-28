import { requestJson } from "@/services/apiClient";
import type { ChatMessage, ConversationSummary } from "@/types/message";

interface ConversationsResponse {
  status: string;
  results: number;
  data: {
    conversations: ConversationSummary[];
  };
}

interface ConversationMessagesResponse {
  status: string;
  results: number;
  totalPages?: number;
  currentPage?: number;
  data: {
    messages: ChatMessage[];
  };
}

interface SendMessageResponse {
  status: string;
  data: {
    message: ChatMessage;
    conversationId: string;
  };
}

interface MarkAsReadResponse {
  status: string;
  data: {
    updatedCount: number;
    unreadCount: number;
  };
}

interface UnreadCountResponse {
  status: string;
  data: {
    unreadCount: number;
  };
}

interface ChatbotResponse {
  status: string;
  data: {
    answer: string;
    createdAt: string;
    suggestions?: string[];
    intent?: "property" | "navigation" | "mixed";
    properties?: Array<{
      _id: string;
      title: string;
      address: string;
      price: number;
      url: string;
    }>;
    navigation?: {
      routes?: Array<{
        route: string;
        title: string;
        summary: string;
        steps?: string[];
      }>;
      workflows?: Array<{
        title: string;
        routes?: string[];
        guidance?: string[];
      }>;
      guideSections?: Array<{
        title: string;
        excerpt: string;
      }>;
    };
  };
}

export interface ChatbotHistoryItem {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}

interface ChatbotMemoryResponse {
  status: string;
  data: {
    summary?: string;
    preferenceProfile?: {
      budgetMin?: number | null;
      budgetMax?: number | null;
      locationKeyword?: string;
      bedrooms?: number | null;
      bathrooms?: number | null;
      propertyTypes?: string[];
      amenities?: string[];
      lastIntent?: "property" | "navigation" | "mixed" | "unknown";
      lastUpdatedAt?: string;
    };
    recentMessages?: ChatbotHistoryItem[];
    turnsSinceSummary?: number;
    updatedAt?: string;
  };
}

export interface SendMessagePayload {
  receiverId: string;
  content?: string;
  image?: File | null;
  propertyId?: string;
  propertyTitle?: string;
  propertyAddress?: string;
  propertyPrice?: number;
  propertyDescription?: string;
  propertyImageUrl?: string;
  propertyUrl?: string;
}

const appendIfPresent = (formData: FormData, key: string, value: unknown) => {
  if (value === undefined || value === null || value === "") {
    return;
  }
  formData.append(key, String(value));
};

export const messageService = {
  async getConversations() {
    const response = await requestJson<ConversationsResponse>("/messages/conversations", {
      method: "GET",
    });
    return response.data.conversations || [];
  },

  async getConversationMessages(conversationId: string, page = 1, limit = 30) {
    const safeConversationId = encodeURIComponent(conversationId);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

    const response = await requestJson<ConversationMessagesResponse>(
      `/messages/conversations/${safeConversationId}/messages?${params.toString()}`,
      { method: "GET" }
    );
    return response.data.messages || [];
  },

  async sendMessage(payload: SendMessagePayload) {
    const formData = new FormData();
    appendIfPresent(formData, "receiverId", payload.receiverId);
    appendIfPresent(formData, "content", payload.content?.trim());
    appendIfPresent(formData, "propertyId", payload.propertyId);
    appendIfPresent(formData, "propertyTitle", payload.propertyTitle);
    appendIfPresent(formData, "propertyAddress", payload.propertyAddress);
    appendIfPresent(formData, "propertyPrice", payload.propertyPrice);
    appendIfPresent(formData, "propertyDescription", payload.propertyDescription);
    appendIfPresent(formData, "propertyImageUrl", payload.propertyImageUrl);
    appendIfPresent(formData, "propertyUrl", payload.propertyUrl);
    if (payload.image instanceof File) {
      formData.append("image", payload.image);
    }

    return requestJson<SendMessageResponse, FormData>("/messages/send", {
      method: "POST",
      body: formData,
    });
  },

  async markConversationAsRead(conversationId: string) {
    const safeConversationId = encodeURIComponent(conversationId);
    const response = await requestJson<MarkAsReadResponse>(
      `/messages/conversations/${safeConversationId}/read`,
      { method: "PATCH" }
    );
    return response.data;
  },

  async getUnreadCount() {
    const response = await requestJson<UnreadCountResponse>("/messages/unread-count", {
      method: "GET",
    });
    return response.data.unreadCount || 0;
  },

  async askChatbot(prompt: string, history: ChatbotHistoryItem[] = []) {
    const response = await requestJson<
      ChatbotResponse,
      { question: string; history?: ChatbotHistoryItem[] }
    >(
      "/chatbot/query",
      {
        method: "POST",
        body: { question: prompt, history },
      }
    );
    return response.data;
  },

  async getChatbotMemory() {
    const response = await requestJson<ChatbotMemoryResponse>("/chatbot/memory", {
      method: "GET",
    });
    return response.data;
  },

  async clearChatbotMemory() {
    const response = await requestJson<ChatbotMemoryResponse>("/chatbot/memory", {
      method: "DELETE",
    });
    return response.data;
  },
};

export default messageService;
