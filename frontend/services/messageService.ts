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

  async askChatbot(prompt: string) {
    const response = await requestJson<ChatbotResponse, { prompt: string }>(
      "/messages/chatbot",
      {
        method: "POST",
        body: { prompt },
      }
    );
    return response.data;
  },
};

export default messageService;
