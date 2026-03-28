import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { Socket } from "socket.io-client";
import { useAuth } from "@/contexts/AuthContext";
import messageService from "@/services/messageService";
import { connectSocket, disconnectSocket } from "@/services/socketClient";
import type {
  ChatMessage,
  ConversationSummary,
  MessageUser,
  PropertySnapshot,
} from "@/types/message";

export const AI_CONVERSATION_ID = "ai-assistant";
const AI_USER_ID = "ai-assistant";
const CONVERSATION_REFRESH_THROTTLE_MS = 2500;
const getConversationId = (userA: string, userB: string) =>
  [String(userA), String(userB)].sort().join(":");

interface OpenPropertyChatPayload {
  receiverId: string;
  receiverName?: string;
  property: {
    propertyId?: string;
    title?: string;
    address?: string;
    price?: number;
    description?: string;
    imageUrl?: string;
    propertyType?: string;
    bedrooms?: number;
    bathrooms?: number;
    propertyUrl?: string;
  };
}

interface PropertyPrefillState extends OpenPropertyChatPayload {
  draftMessage: string;
}

interface SendMessageInput {
  conversationId?: string;
  receiverId?: string;
  content?: string;
  image?: File | null;
  propertySnapshot?: PropertySnapshot;
}

interface MessagingContextValue {
  isMessagingEnabled: boolean;
  isChatOpen: boolean;
  unreadCount: number;
  conversations: ConversationSummary[];
  activeConversationId: string;
  activeMessages: ChatMessage[];
  loadingConversations: boolean;
  loadingMessages: boolean;
  sendingMessage: boolean;
  chatbotThinking: boolean;
  errorMessage: string | null;
  propertyPrefill: PropertyPrefillState | null;
  openChatbox: (conversationId?: string) => void;
  closeChatbox: () => void;
  setActiveConversation: (conversationId: string) => Promise<void>;
  sendMessage: (input: SendMessageInput) => Promise<void>;
  sendChatbotMessage: (prompt: string) => Promise<void>;
  markConversationAsRead: (conversationId: string) => Promise<void>;
  refreshConversations: (options?: { silent?: boolean }) => Promise<void>;
  openPropertyPrefill: (payload: OpenPropertyChatPayload) => void;
  closePropertyPrefill: () => void;
  submitPropertyPrefill: (draftMessage?: string) => Promise<void>;
}

const MessagingContext = createContext<MessagingContextValue | undefined>(undefined);

const sortConversations = (items: ConversationSummary[]) => {
  return [...items].sort((a, b) => {
    const timeA = new Date(a.updatedAt || a.lastMessage?.createdAt || 0).getTime();
    const timeB = new Date(b.updatedAt || b.lastMessage?.createdAt || 0).getTime();
    return timeB - timeA;
  });
};

const generatePrefillMessage = (
  payload: OpenPropertyChatPayload["property"],
  receiverName?: string
) => {
  const namePart = receiverName ? ` ${receiverName}` : "";
  const lines = [
    `Xin chào${namePart}, tôi quan tâm đến bất động sản sau:`,
    payload.title ? `- Tên: ${payload.title}` : "",
    payload.address ? `- Địa chỉ: ${payload.address}` : "",
    typeof payload.price === "number"
      ? `- Giá niêm yết: ${new Intl.NumberFormat("vi-VN").format(payload.price)}₫`
      : "",
    payload.propertyType ? `- Loại hình: ${payload.propertyType}` : "",
    Number.isFinite(payload.bedrooms) ? `- Phòng ngủ: ${payload.bedrooms}` : "",
    Number.isFinite(payload.bathrooms) ? `- Phòng tắm: ${payload.bathrooms}` : "",
    payload.description ? `- Mô tả: ${payload.description.slice(0, 160)}` : "",
    payload.propertyUrl ? `- Link chi tiết: ${payload.propertyUrl}` : "",
    "Nhờ bạn tư vấn thêm thông tin và lịch xem thực tế. Cảm ơn.",
  ].filter(Boolean);
  return lines.join("\n");
};

const buildAiMessage = (
  currentUserId: string,
  content: string,
  fromAi: boolean,
  options?: { createdAt?: string; customId?: string }
): ChatMessage => {
  const now = options?.createdAt || new Date().toISOString();
  const messageId =
    options?.customId || `ai-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return {
    _id: messageId,
    conversationId: AI_CONVERSATION_ID,
    senderId: fromAi ? AI_USER_ID : currentUserId,
    receiverId: fromAi ? currentUserId : AI_USER_ID,
    sender: fromAi
      ? {
          _id: AI_USER_ID,
          name: "EstateManager AI",
          avatar: "",
          role: "provider",
        }
      : null,
    receiver: fromAi ? null : { _id: AI_USER_ID, name: "EstateManager AI", avatar: "" },
    messageType: "text",
    content,
    imageUrl: "",
    propertySnapshot: null,
    isRead: true,
    readAt: now,
    createdAt: now,
    updatedAt: now,
  };
};

export function MessagingProvider({ children }: { children: ReactNode }) {
  const { user, token, isAuthLoading } = useAuth();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>(AI_CONVERSATION_ID);
  const [messagesByConversation, setMessagesByConversation] = useState<
    Record<string, ChatMessage[]>
  >({});
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [chatbotThinking, setChatbotThinking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [propertyPrefill, setPropertyPrefill] = useState<PropertyPrefillState | null>(null);

  const activeConversationRef = useRef(activeConversationId);
  const chatOpenRef = useRef(isChatOpen);
  const messagesMapRef = useRef(messagesByConversation);
  const conversationsRef = useRef(conversations);
  const lastConversationsRefreshRef = useRef(0);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    activeConversationRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    chatOpenRef.current = isChatOpen;
  }, [isChatOpen]);

  useEffect(() => {
    messagesMapRef.current = messagesByConversation;
  }, [messagesByConversation]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const isMessagingEnabled =
    Boolean(user && token && !isAuthLoading && (user.role === "user" || user.role === "provider"));

  const upsertMessageIntoCache = useCallback((message: ChatMessage) => {
    setMessagesByConversation((prev) => {
      const conversationId = message.conversationId;
      const current = prev[conversationId] || [];
      if (current.some((item) => item._id === message._id)) {
        return prev;
      }
      return {
        ...prev,
        [conversationId]: [...current, message].sort((a, b) => {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }),
      };
    });
  }, []);

  const upsertConversationFromMessage = useCallback(
    (message: ChatMessage, hintParticipant?: MessageUser | null, unreadHint?: number) => {
      if (!user) return;
      const userId = String(user._id);
      const participant =
        hintParticipant ||
        (message.senderId === userId ? message.receiver || null : message.sender || null);

      setConversations((prev) => {
        const existingIndex = prev.findIndex(
          (item) => item.conversationId === message.conversationId
        );

        const shouldMarkUnread =
          message.receiverId === userId &&
          !message.isRead &&
          (!chatOpenRef.current || activeConversationRef.current !== message.conversationId);

        const baseUnread = existingIndex >= 0 ? prev[existingIndex].unreadCount : 0;
        const unreadCount =
          typeof unreadHint === "number"
            ? unreadHint
            : shouldMarkUnread
              ? baseUnread + 1
              : activeConversationRef.current === message.conversationId
                ? 0
                : baseUnread;

        const nextConversation: ConversationSummary = {
          conversationId: message.conversationId,
          participant:
            participant ||
            (existingIndex >= 0 ? prev[existingIndex].participant : null),
          unreadCount,
          updatedAt: message.createdAt,
          lastMessage: message,
        };

        if (existingIndex === -1) {
          return sortConversations([nextConversation, ...prev]);
        }

        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          ...nextConversation,
        };
        return sortConversations(next);
      });
    },
    [user]
  );

  const refreshConversations = useCallback(async (options?: { silent?: boolean; force?: boolean }) => {
    if (!isMessagingEnabled) return;

    const isForce = options?.force ?? false;
    const now = Date.now();
    if (!isForce && now - lastConversationsRefreshRef.current < CONVERSATION_REFRESH_THROTTLE_MS) {
      return;
    }
    lastConversationsRefreshRef.current = now;

    const isSilent = options?.silent ?? false;
    if (!isSilent) {
      setLoadingConversations(true);
      setErrorMessage(null);
    }
    try {
      const [conversationList, unread] = await Promise.all([
        messageService.getConversations(),
        messageService.getUnreadCount(),
      ]);
      setConversations(sortConversations(conversationList));
      setUnreadCount(unread);
      if (
        activeConversationRef.current === AI_CONVERSATION_ID &&
        conversationList.length > 0 &&
        !chatOpenRef.current
      ) {
        setActiveConversationId(conversationList[0].conversationId);
      }
    } catch (error) {
      const fallback = "Không thể tải danh sách cuộc trò chuyện.";
      if (!isSilent) {
        setErrorMessage(error instanceof Error ? error.message || fallback : fallback);
      }
    } finally {
      if (!isSilent) {
        setLoadingConversations(false);
      }
    }
  }, [isMessagingEnabled]);

  const markConversationAsRead = useCallback(
    async (conversationId: string) => {
      if (!isMessagingEnabled || !conversationId || conversationId === AI_CONVERSATION_ID || !user) {
        return;
      }

      const localConversation = conversationsRef.current.find(
        (item) => item.conversationId === conversationId
      );
      if (localConversation && localConversation.unreadCount <= 0) {
        return;
      }

      setConversations((prev) =>
        prev.map((item) =>
          item.conversationId === conversationId ? { ...item, unreadCount: 0 } : item
        )
      );

      setMessagesByConversation((prev) => {
        const messages = prev[conversationId];
        if (!messages?.length) return prev;
        const now = new Date().toISOString();
        return {
          ...prev,
          [conversationId]: messages.map((message) =>
            message.receiverId === user._id
              ? { ...message, isRead: true, readAt: now }
              : message
          ),
        };
      });

      try {
        const result = await messageService.markConversationAsRead(conversationId);
        if (typeof result.unreadCount === "number") {
          setUnreadCount(result.unreadCount);
        }
      } catch {
        // Keep optimistic UI if API temporarily fails.
      }
    },
    [isMessagingEnabled, user]
  );

  const loadConversationMessages = useCallback(
    async (conversationId: string, forceRefresh = false) => {
      if (!isMessagingEnabled || conversationId === AI_CONVERSATION_ID) return;

      const cached = messagesMapRef.current[conversationId];
      if (!forceRefresh && cached?.length) {
        return;
      }

      setLoadingMessages(true);
      setErrorMessage(null);
      try {
        const messages = await messageService.getConversationMessages(conversationId, 1, 80);
        setMessagesByConversation((prev) => ({ ...prev, [conversationId]: messages }));
      } catch (error) {
        const fallback = "Không thể tải nội dung cuộc trò chuyện.";
        setErrorMessage(error instanceof Error ? error.message || fallback : fallback);
      } finally {
        setLoadingMessages(false);
      }
    },
    [isMessagingEnabled]
  );

  const setActiveConversation = useCallback(
    async (conversationId: string) => {
      if (!conversationId) return;
      setActiveConversationId(conversationId);
      setIsChatOpen(true);

      if (conversationId === AI_CONVERSATION_ID) {
        return;
      }

      const targetConversation = conversationsRef.current.find(
        (item) => item.conversationId === conversationId
      );
      const shouldForceRefresh = Boolean(targetConversation && targetConversation.unreadCount > 0);

      await loadConversationMessages(conversationId, shouldForceRefresh);

      if ((targetConversation?.unreadCount || 0) > 0) {
        await markConversationAsRead(conversationId);
      }
    },
    [loadConversationMessages, markConversationAsRead]
  );

  const openChatbox = useCallback(
    (conversationId?: string) => {
      setIsChatOpen(true);
      void refreshConversations({ silent: true });

      if (conversationId) {
        void setActiveConversation(conversationId);
        return;
      }

      const currentConversationId = activeConversationRef.current;
      const hasCurrentConversation = conversations.some(
        (item) => item.conversationId === currentConversationId
      );
      const firstUnreadConversation = conversations.find((item) => item.unreadCount > 0);
      const defaultConversationId =
        firstUnreadConversation?.conversationId ||
        conversations[0]?.conversationId ||
        AI_CONVERSATION_ID;

      const nextConversationId =
        currentConversationId !== AI_CONVERSATION_ID && hasCurrentConversation
          ? currentConversationId
          : defaultConversationId;

      void setActiveConversation(nextConversationId);
    },
    [conversations, refreshConversations, setActiveConversation]
  );

  const closeChatbox = useCallback(() => {
    setIsChatOpen(false);
  }, []);

  const resolveReceiverId = useCallback(
    (conversationId?: string, explicitReceiverId?: string) => {
      if (explicitReceiverId) return explicitReceiverId;
      if (!conversationId) return "";
      const found = conversations.find((item) => item.conversationId === conversationId);
      return found?.participant?._id || "";
    },
    [conversations]
  );

  const sendMessage = useCallback(
    async (input: SendMessageInput) => {
      if (!isMessagingEnabled || !user) {
        throw new Error("Bạn cần đăng nhập để gửi tin nhắn.");
      }

      const conversationId = input.conversationId || activeConversationRef.current;
      const receiverId = resolveReceiverId(conversationId, input.receiverId);
      const trimmedContent = (input.content || "").trim();

      if (!receiverId) {
        throw new Error("Không tìm thấy người nhận cho cuộc trò chuyện này.");
      }

      if (!trimmedContent && !(input.image instanceof File)) {
        throw new Error("Tin nhắn không được để trống.");
      }

      setSendingMessage(true);
      setErrorMessage(null);
      try {
        const response = await messageService.sendMessage({
          receiverId,
          content: trimmedContent,
          image: input.image || null,
          propertyId: input.propertySnapshot?.propertyId,
          propertyTitle: input.propertySnapshot?.title,
          propertyAddress: input.propertySnapshot?.address,
          propertyPrice: input.propertySnapshot?.price,
          propertyDescription: input.propertySnapshot?.description,
          propertyImageUrl: input.propertySnapshot?.imageUrl,
          propertyUrl: input.propertySnapshot?.propertyUrl,
        });

        const createdMessage = response.data.message;
        upsertMessageIntoCache(createdMessage);
        upsertConversationFromMessage(createdMessage);
        setActiveConversationId(createdMessage.conversationId);
        setIsChatOpen(true);
      } catch (error) {
        const fallback = "Không thể gửi tin nhắn lúc này.";
        const message = error instanceof Error ? error.message || fallback : fallback;
        setErrorMessage(message);
        throw new Error(message);
      } finally {
        setSendingMessage(false);
      }
    },
    [isMessagingEnabled, resolveReceiverId, upsertConversationFromMessage, upsertMessageIntoCache, user]
  );

  const sendChatbotMessage = useCallback(
    async (prompt: string) => {
      if (!user) return;
      const normalized = prompt.trim();
      if (!normalized) return;

      const userMessage = buildAiMessage(user._id, normalized, false);
      setAiMessages((prev) => [...prev, userMessage]);
      setChatbotThinking(true);
      setErrorMessage(null);

      try {
        const response = await messageService.askChatbot(normalized);
        const aiMessage = buildAiMessage(
          user._id,
          response.answer || "AI assistant is processing your request.",
          true
        );
        setAiMessages((prev) => [...prev, aiMessage]);
      } catch (error) {
        const fallback = "Không thể kết nối AI assistant.";
        setErrorMessage(error instanceof Error ? error.message || fallback : fallback);
        const aiFallback = buildAiMessage(
          user._id,
          "AI assistant hiện chưa phản hồi được. Vui lòng thử lại sau.",
          true
        );
        setAiMessages((prev) => [...prev, aiFallback]);
      } finally {
        setChatbotThinking(false);
      }
    },
    [user]
  );

  const openPropertyPrefill = useCallback((payload: OpenPropertyChatPayload) => {
    setPropertyPrefill({
      ...payload,
      draftMessage: generatePrefillMessage(payload.property, payload.receiverName),
    });
    setIsChatOpen(true);
  }, []);

  const closePropertyPrefill = useCallback(() => {
    setPropertyPrefill(null);
  }, []);

  const submitPropertyPrefill = useCallback(
    async (draftMessage?: string) => {
      if (!propertyPrefill) return;
      if (!user?._id) return;
      const finalDraft = (draftMessage ?? propertyPrefill.draftMessage ?? "").trim();
      if (!finalDraft) {
        throw new Error("Nội dung tư vấn không được để trống.");
      }

      await sendMessage({
        receiverId: propertyPrefill.receiverId,
        content: finalDraft,
        propertySnapshot: {
          propertyId: propertyPrefill.property.propertyId,
          title: propertyPrefill.property.title,
          address: propertyPrefill.property.address,
          price: propertyPrefill.property.price,
          description: propertyPrefill.property.description,
          imageUrl: propertyPrefill.property.imageUrl,
          propertyUrl: propertyPrefill.property.propertyUrl,
        },
      });

      const conversationId = getConversationId(user._id, propertyPrefill.receiverId);
      setPropertyPrefill(null);
      await setActiveConversation(conversationId);
    },
    [propertyPrefill, sendMessage, setActiveConversation, user?._id]
  );

  useEffect(() => {
    if (!isMessagingEnabled) {
      setConversations([]);
      setUnreadCount(0);
      setMessagesByConversation({});
      setAiMessages([]);
      setActiveConversationId(AI_CONVERSATION_ID);
      setPropertyPrefill(null);
      setIsChatOpen(false);
      setErrorMessage(null);
      disconnectSocket();
      socketRef.current = null;
      return;
    }

    void refreshConversations({ force: true });
  }, [isMessagingEnabled, refreshConversations]);

  useEffect(() => {
    if (!isMessagingEnabled || !user?._id) return;
    let disposed = false;

    const hydrateChatbotMemory = async () => {
      try {
        const memory = await messageService.getChatbotMemory();
        if (disposed) return;

        const hydrated = (memory.recentMessages || [])
          .map((item, index) => {
            const content = String(item.content || "").trim();
            if (!content) return null;
            const fromAi = item.role === "assistant";
            return buildAiMessage(user._id, content, fromAi, {
              createdAt: item.createdAt,
              customId: `ai-memory-${index}-${item.createdAt || "no-time"}`,
            });
          })
          .filter((item): item is ChatMessage => Boolean(item));

        setAiMessages(hydrated);
      } catch {
        // Keep local-memory fallback if backend memory cannot be loaded.
      }
    };

    void hydrateChatbotMemory();
    return () => {
      disposed = true;
    };
  }, [isMessagingEnabled, user?._id]);

  useEffect(() => {
    if (!isMessagingEnabled || !token || !user) return;

    const socket = connectSocket(token);
    socketRef.current = socket;
    if (!socket) return;

    const userId = String(user._id);

    const onNewMessage = (payload: unknown) => {
      const safePayload = payload as
        | {
            data?: {
              message?: ChatMessage;
              conversation?: {
                participant?: MessageUser | null;
                unreadCount?: number;
              };
            };
          }
        | undefined;

      const incoming = safePayload?.data?.message;
      if (!incoming) return;

      upsertMessageIntoCache(incoming);
      upsertConversationFromMessage(
        incoming,
        safePayload?.data?.conversation?.participant || null,
        safePayload?.data?.conversation?.unreadCount
      );

      if (
        incoming.receiverId === userId &&
        activeConversationRef.current === incoming.conversationId &&
        chatOpenRef.current
      ) {
        void markConversationAsRead(incoming.conversationId);
      }
    };

    const onUnreadCount = (payload: unknown) => {
      const count =
        (payload as { data?: { unreadCount?: number } } | undefined)?.data?.unreadCount ?? 0;
      setUnreadCount(Math.max(0, count));
      void refreshConversations({ silent: true });
    };

    const onConversationRead = (payload: unknown) => {
      const readConversationId =
        (payload as { data?: { conversationId?: string } } | undefined)?.data?.conversationId;
      if (!readConversationId) return;
      setConversations((prev) =>
        prev.map((item) =>
          item.conversationId === readConversationId
            ? {
                ...item,
                lastMessage: { ...item.lastMessage, isRead: true },
              }
            : item
        )
      );
    };

    socket.on("message:new", onNewMessage);
    socket.on("message:unread_count", onUnreadCount);
    socket.on("conversation:read", onConversationRead);

    return () => {
      socket.off("message:new", onNewMessage);
      socket.off("message:unread_count", onUnreadCount);
      socket.off("conversation:read", onConversationRead);
    };
  }, [
    isMessagingEnabled,
    markConversationAsRead,
    token,
    upsertConversationFromMessage,
    upsertMessageIntoCache,
    refreshConversations,
    user,
  ]);

  useEffect(() => {
    if (!isMessagingEnabled) return;
    if (activeConversationId === AI_CONVERSATION_ID) return;
    if (!socketRef.current) return;

    socketRef.current.emit("conversation:join", activeConversationId);
    return () => {
      socketRef.current?.emit("conversation:leave", activeConversationId);
    };
  }, [activeConversationId, isMessagingEnabled]);

  const activeMessages = useMemo(() => {
    if (activeConversationId === AI_CONVERSATION_ID) {
      return aiMessages;
    }
    return messagesByConversation[activeConversationId] || [];
  }, [activeConversationId, aiMessages, messagesByConversation]);

  const contextValue = useMemo<MessagingContextValue>(
    () => ({
      isMessagingEnabled,
      isChatOpen,
      unreadCount,
      conversations,
      activeConversationId,
      activeMessages,
      loadingConversations,
      loadingMessages,
      sendingMessage,
      chatbotThinking,
      errorMessage,
      propertyPrefill,
      openChatbox,
      closeChatbox,
      setActiveConversation,
      sendMessage,
      sendChatbotMessage,
      markConversationAsRead,
      refreshConversations,
      openPropertyPrefill,
      closePropertyPrefill,
      submitPropertyPrefill,
    }),
    [
      activeConversationId,
      activeMessages,
      chatbotThinking,
      closeChatbox,
      closePropertyPrefill,
      conversations,
      errorMessage,
      isChatOpen,
      isMessagingEnabled,
      loadingConversations,
      loadingMessages,
      markConversationAsRead,
      openChatbox,
      openPropertyPrefill,
      propertyPrefill,
      refreshConversations,
      sendChatbotMessage,
      sendMessage,
      sendingMessage,
      setActiveConversation,
      submitPropertyPrefill,
      unreadCount,
    ]
  );

  return <MessagingContext.Provider value={contextValue}>{children}</MessagingContext.Provider>;
}

export function useMessaging() {
  const context = useContext(MessagingContext);
  if (!context) {
    throw new Error("useMessaging must be used inside MessagingProvider");
  }
  return context;
}
