import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import Image from "next/image";
import {
  ImagePlus,
  MessageCircle,
  SendHorizontal,
  X,
} from "lucide-react";
import { AI_CONVERSATION_ID, useMessaging } from "@/contexts/MessagingContext";
import type { ChatMessage, ConversationSummary } from "@/types/message";

const formatTime = (iso?: string) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const sameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (sameDay) {
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
};

const clipText = (value: string | undefined, max = 50) => {
  if (!value) return "";
  return value.length <= max ? value : `${value.slice(0, max)}…`;
};

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;
const PROPERTY_DETAIL_URL_PATTERN = /^https?:\/\/\S+\/properties\/[a-f0-9]{24}(?:[/?#]\S*)?$/i;
const isHttpUrl = (value: string) => /^https?:\/\/\S+$/i.test(value);
const isPropertyDetailUrl = (value: string) => PROPERTY_DETAIL_URL_PATTERN.test(value);
const SUBSCRIPTION_SYSTEM_NAMES = new Set(["subcription", "subscription", "subscripton"]);
const CHATBOT_DISPLAY_NAME = "Clara";
const CHATBOT_AVATAR_URL = "/clara-avatar.svg";

const isSubscriptionSystemConversation = (
  conversation?: ConversationSummary | null
) => {
  if (!conversation || conversation.conversationId === AI_CONVERSATION_ID) return false;
  const participant = conversation.participant;
  if (!participant) return false;
  if (participant.role !== "admin") return false;
  const normalizedName = String(participant.name || "").trim().toLowerCase();
  return SUBSCRIPTION_SYSTEM_NAMES.has(normalizedName);
};

export default function MessagingWidget() {
  const {
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
    closePropertyPrefill,
    submitPropertyPrefill,
  } = useMessaging();

  const [draft, setDraft] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [prefillDraft, setPrefillDraft] = useState("");
  const [submittingPrefill, setSubmittingPrefill] = useState(false);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setPrefillDraft(propertyPrefill?.draftMessage || "");
  }, [propertyPrefill]);

  useEffect(() => {
    if (!messageEndRef.current) return;
    messageEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [activeConversationId, activeMessages, chatbotThinking]);

  const aiConversation: ConversationSummary = useMemo(() => {
    const lastAiMessage = activeConversationId === AI_CONVERSATION_ID
      ? activeMessages[activeMessages.length - 1]
      : undefined;

    const fallbackTime = new Date().toISOString();

    return {
      conversationId: AI_CONVERSATION_ID,
      participant: {
        _id: AI_CONVERSATION_ID,
        name: CHATBOT_DISPLAY_NAME,
        avatar: CHATBOT_AVATAR_URL,
        role: "provider",
      },
      unreadCount: 0,
      updatedAt: lastAiMessage?.createdAt || fallbackTime,
      lastMessage: {
        _id: "ai-preview",
        conversationId: AI_CONVERSATION_ID,
        senderId: AI_CONVERSATION_ID,
        receiverId: "",
        messageType: "text",
        content: lastAiMessage?.content || "Clara sẵn sàng tư vấn mua bán bất động sản",
        imageUrl: "",
        propertySnapshot: null,
        isRead: true,
        readAt: null,
        createdAt: lastAiMessage?.createdAt || fallbackTime,
        updatedAt: lastAiMessage?.createdAt || fallbackTime,
      },
    };
  }, [activeConversationId, activeMessages]);

  const allConversations = useMemo(
    () => [aiConversation, ...conversations],
    [aiConversation, conversations]
  );

  const activeConversation = useMemo(
    () => allConversations.find((item) => item.conversationId === activeConversationId) || aiConversation,
    [activeConversationId, aiConversation, allConversations]
  );

  const isAiConversation = activeConversationId === AI_CONVERSATION_ID;
  const isSubscriptionOneWayConversation = useMemo(
    () => isSubscriptionSystemConversation(activeConversation),
    [activeConversation]
  );
  const isSubmitting = sendingMessage || chatbotThinking;

  const handleSend = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubscriptionOneWayConversation) {
      setLocalError("Đây là kênh thông báo 1 chiều từ Subcription. Bạn không thể nhắn ngược lại.");
      return;
    }

    const rawDraft = draft;
    const cleaned = draft.trim();
    if (!cleaned && !selectedImage) return;

    setLocalError(null);
    try {
      if (isAiConversation) {
        setDraft("");
        await sendChatbotMessage(cleaned);
        return;
      }

      await sendMessage({
        conversationId: activeConversationId,
        content: cleaned,
        image: selectedImage,
      });
      setDraft("");
      setSelectedImage(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (error) {
      if (isAiConversation) {
        setDraft((current) => current || rawDraft);
      }
      setLocalError(error instanceof Error ? error.message : "Không thể gửi tin nhắn.");
    }
  };

  const onPickImage = () => {
    if (isAiConversation || isSubscriptionOneWayConversation) return;
    fileRef.current?.click();
  };

  const resolveBubbleOwner = (message: ChatMessage) => {
    if (isAiConversation) {
      return message.senderId !== AI_CONVERSATION_ID;
    }
    return message.senderId !== activeConversation?.participant?._id;
  };

  const visibleError = localError || errorMessage;

  if (!isMessagingEnabled) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => (isChatOpen ? closeChatbox() : openChatbox())}
        className="fixed bottom-5 right-5 z-[99989] h-14 w-14 rounded-full border text-white shadow-xl transition-all duration-300 hover:-translate-y-0.5"
        style={{
          borderColor: "rgba(201,169,110,0.45)",
          background:
            "linear-gradient(135deg, rgba(26,32,38,0.94), rgba(37,45,54,0.88))",
          boxShadow: "0 14px 30px rgba(17,28,20,0.25)",
        }}
        aria-label="Mở hộp thoại nhắn tin"
      >
        <span className="absolute inset-0 rounded-full bg-white/5 backdrop-blur-sm" />
        <MessageCircle className="relative mx-auto" size={21} />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {isChatOpen ? (
        <>
          <button
            type="button"
            aria-label="Đóng chatbox khi bấm ra ngoài"
            onClick={closeChatbox}
            className="fixed inset-0 z-[99988] bg-black/10 backdrop-blur-[1px]"
          />
          <div
            className="fixed bottom-24 left-4 right-4 z-[99990] overflow-hidden rounded-2xl border bg-white/90 shadow-2xl backdrop-blur-xl md:left-auto md:right-5 md:w-[860px] md:max-w-[calc(100vw-2.5rem)]"
            style={{
              borderColor: "rgba(154,124,69,0.18)",
              boxShadow: "0 24px 55px rgba(17,28,20,0.2)",
            }}
          >
          <div
            className="grid h-[72vh] max-h-[680px] min-h-[460px] min-w-0 grid-cols-1 overflow-hidden md:grid"
            style={{ gridTemplateColumns: "280px minmax(0, 1fr)" }}
          >
            <aside className="flex min-h-0 flex-col border-b bg-white/80 md:border-b-0 md:border-r" style={{ borderColor: "rgba(154,124,69,0.14)" }}>
              <div className="flex shrink-0 items-center border-b px-4 py-3" style={{ borderColor: "rgba(154,124,69,0.14)" }}>
                <div>
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.18em]"
                    style={{ color: "var(--e-gold)" }}
                  >
                    Messaging
                  </p>
                  <p className="text-sm font-semibold" style={{ color: "var(--e-charcoal)" }}>
                    Cuộc trò chuyện
                  </p>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {loadingConversations ? (
                  <p className="px-4 py-5 text-sm" style={{ color: "var(--e-muted)" }}>
                    Đang tải hội thoại...
                  </p>
                ) : (
                  allConversations.map((conversation) => {
                    const isActive = conversation.conversationId === activeConversationId;
                    const isSystemOneWay = isSubscriptionSystemConversation(conversation);
                    const avatarUrl = conversation.participant?.avatar || "";
                    const avatarAlt = conversation.participant?.name || "Avatar";
                    const preview =
                      conversation.lastMessage.messageType === "image"
                        ? "Đã gửi hình ảnh"
                        : conversation.lastMessage.content || "Bắt đầu cuộc trò chuyện";

                    return (
                      <button
                        key={conversation.conversationId}
                        type="button"
                        onClick={() => void setActiveConversation(conversation.conversationId)}
                        className={`w-full border-b px-4 py-3 text-left transition-colors ${
                          isActive ? "bg-amber-50/70" : "bg-transparent hover:bg-white/70"
                        }`}
                        style={{ borderColor: "rgba(154,124,69,0.1)" }}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border text-sm font-semibold"
                            style={{
                              borderColor: "rgba(154,124,69,0.22)",
                              background:
                                conversation.conversationId === AI_CONVERSATION_ID
                                  ? "rgba(201,169,110,0.17)"
                                  : "rgba(255,255,255,0.88)",
                              color:
                                conversation.conversationId === AI_CONVERSATION_ID
                                  ? "var(--e-gold)"
                                  : "var(--e-charcoal)",
                            }}
                          >
                            {avatarUrl ? (
                              <Image
                                src={avatarUrl}
                                alt={avatarAlt}
                                width={40}
                                height={40}
                                unoptimized
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              (conversation.participant?.name || "?")
                                .slice(0, 1)
                                .toUpperCase()
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p
                                  className="truncate text-sm font-semibold"
                                  style={{ color: "var(--e-charcoal)" }}
                                >
                                  {conversation.participant?.name || "Hội thoại"}
                                </p>
                                {isSystemOneWay ? (
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-700">
                                    Thông báo hệ thống · 1 chiều
                                  </p>
                                ) : null}
                              </div>
                              <span className="shrink-0 text-[11px]" style={{ color: "var(--e-light-muted)" }}>
                                {formatTime(conversation.updatedAt)}
                              </span>
                            </div>
                            <p className="truncate text-xs leading-5" style={{ color: "var(--e-muted)" }}>
                              {clipText(preview, 55)}
                            </p>
                          </div>

                          {conversation.unreadCount > 0 ? (
                            <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                              {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                            </span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>

            <section className="flex h-full min-h-0 flex-col bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,249,238,0.72))]">
              <header
                className="flex shrink-0 items-center justify-between border-b px-4 py-3"
                style={{ borderColor: "rgba(154,124,69,0.14)" }}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border bg-white/85 text-sm font-semibold"
                    style={{ borderColor: "rgba(154,124,69,0.22)", color: "var(--e-charcoal)" }}
                  >
                    {activeConversation.participant?.avatar ? (
                      <Image
                        src={activeConversation.participant.avatar}
                        alt={activeConversation.participant?.name || "Avatar"}
                        width={40}
                        height={40}
                        unoptimized
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      (activeConversation.participant?.name || "?").slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.16em]"
                      style={{ color: "var(--e-gold)" }}
                    >
                      {isAiConversation
                        ? "Clara Assistant"
                        : isSubscriptionOneWayConversation
                          ? "System Notification"
                          : "Direct Chat"}
                    </p>
                    <p className="truncate text-sm font-semibold" style={{ color: "var(--e-charcoal)" }}>
                      {activeConversation.participant?.name || "Tin nhắn"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeChatbox}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-white/80 text-slate-600 transition-colors hover:bg-white"
                  style={{ borderColor: "rgba(154,124,69,0.18)" }}
                  aria-label="Đóng chatbox"
                >
                  <X size={16} />
                </button>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                {loadingMessages ? (
                  <p className="text-sm" style={{ color: "var(--e-muted)" }}>
                    Đang tải tin nhắn...
                  </p>
                ) : activeMessages.length === 0 ? (
                  <div className="rounded-xl border border-dashed px-4 py-6 text-center text-sm" style={{ borderColor: "rgba(154,124,69,0.2)", color: "var(--e-light-muted)" }}>
                    Chưa có tin nhắn. Hãy bắt đầu cuộc trò chuyện.
                  </div>
                ) : (
                  activeMessages.map((message) => {
                    const isMine = resolveBubbleOwner(message);
                    const hasSnapshot = Boolean(message.propertySnapshot?.title);

                    return (
                      <div
                        key={message._id}
                        className={`mb-3 flex ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[82%] rounded-2xl border px-3 py-2 ${
                            isMine
                              ? "bg-[rgba(37,45,54,0.94)] text-white"
                              : "bg-white/90 text-slate-800"
                          } break-words`}
                          style={{
                            borderColor: isMine
                              ? "rgba(37,45,54,0.72)"
                              : "rgba(154,124,69,0.18)",
                          }}
                        >
                          {hasSnapshot ? (
                            <div className="mb-2 rounded-lg border bg-white/10 p-2 text-xs" style={{ borderColor: isMine ? "rgba(255,255,255,0.22)" : "rgba(154,124,69,0.22)" }}>
                              <p className="break-words font-semibold leading-5">
                                {message.propertySnapshot?.title}
                              </p>
                              {message.propertySnapshot?.address ? (
                                <p className="break-words opacity-85">{message.propertySnapshot.address}</p>
                              ) : null}
                              {message.propertySnapshot?.propertyUrl ? (
                                <a
                                  href={message.propertySnapshot.propertyUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`mt-1 inline-block underline ${isMine ? "text-white" : "text-slate-700"}`}
                                >
                                  Xem chi tiết
                                </a>
                              ) : null}
                            </div>
                          ) : null}

                          {message.imageUrl ? (
                            <div className="mb-2 overflow-hidden rounded-lg border" style={{ borderColor: "rgba(154,124,69,0.2)" }}>
                              <Image
                                src={message.imageUrl}
                                alt="Message image"
                                width={360}
                                height={250}
                                unoptimized
                                className="h-auto w-full object-cover"
                              />
                            </div>
                          ) : null}

                          {message.content ? (
                            <p className="whitespace-pre-wrap break-words text-sm leading-6">
                              {message.content.split(URL_PATTERN).map((segment, index) => {
                                if (isHttpUrl(segment)) {
                                  const isPropertyLink = isPropertyDetailUrl(segment);
                                  return (
                                    <a
                                      key={`${message._id}-segment-${index}`}
                                      href={segment}
                                      target="_blank"
                                      rel="noreferrer"
                                      className={`break-all underline decoration-1 underline-offset-2 ${
                                        isPropertyLink
                                          ? isMine
                                            ? "text-sky-200 hover:text-sky-100 font-semibold"
                                            : "text-blue-600 hover:text-blue-700 font-semibold"
                                          : isMine
                                            ? "text-white"
                                            : "text-slate-700"
                                      }`}
                                    >
                                      {isPropertyLink ? "Nhấp vào để xem chi tiết" : segment}
                                    </a>
                                  );
                                }
                                return (
                                  <span key={`${message._id}-segment-${index}`}>{segment}</span>
                                );
                              })}
                            </p>
                          ) : null}

                          <p className={`mt-1 text-[11px] ${isMine ? "text-white/70" : "text-slate-500"}`}>
                            {formatTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}

                {chatbotThinking ? (
                  <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-700">
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                    Đang nhập...
                  </div>
                ) : null}
                <div ref={messageEndRef} />
              </div>

              <div className="shrink-0 border-t px-4 py-3" style={{ borderColor: "rgba(154,124,69,0.14)" }}>
                {visibleError ? (
                  <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                    {visibleError}
                  </div>
                ) : null}

                {isSubscriptionOneWayConversation ? (
                  <div className="mb-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Kênh thông báo 1 chiều từ Subcription. Bạn chỉ có thể nhận thông báo, không thể phản hồi.
                  </div>
                ) : null}

                {selectedImage ? (
                  <div className="mb-2 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <p className="truncate">Đính kèm: {selectedImage.name}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedImage(null);
                        if (fileRef.current) fileRef.current.value = "";
                      }}
                      className="font-semibold"
                    >
                      Xóa
                    </button>
                  </div>
                ) : null}

                <form onSubmit={handleSend} className="flex items-end gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileRef}
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null;
                      setSelectedImage(file);
                    }}
                  />

                  <button
                    type="button"
                    onClick={onPickImage}
                    disabled={isAiConversation || isSubscriptionOneWayConversation}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border bg-white/80 text-slate-600 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ borderColor: "rgba(154,124,69,0.18)" }}
                    aria-label="Đính kèm hình ảnh"
                  >
                    <ImagePlus size={16} />
                  </button>

                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    rows={1}
                    disabled={isSubscriptionOneWayConversation}
                    placeholder={
                      isAiConversation
                        ? "Đặt câu hỏi cho AI..."
                        : isSubscriptionOneWayConversation
                          ? "Kênh này chỉ nhận thông báo từ hệ thống."
                          : "Nhập tin nhắn..."
                    }
                    className="min-h-10 flex-1 resize-none rounded-lg border px-3 py-2 text-sm outline-none transition-all focus:border-amber-400"
                    style={{
                      borderColor: "rgba(154,124,69,0.22)",
                      background: isSubscriptionOneWayConversation
                        ? "rgba(245,245,244,0.95)"
                        : "rgba(255,255,255,0.92)",
                    }}
                  />

                  <button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      isSubscriptionOneWayConversation ||
                      (!draft.trim() && !selectedImage)
                    }
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      borderColor: "rgba(37,45,54,0.35)",
                      background: "var(--e-charcoal)",
                    }}
                    aria-label="Gửi tin nhắn"
                  >
                    <SendHorizontal size={16} />
                  </button>
                </form>
              </div>
            </section>
          </div>
          </div>
        </>
      ) : null}

      {propertyPrefill ? (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/35 px-4 backdrop-blur-[2px]">
          <div
            className="w-full max-w-2xl rounded-2xl border bg-white/95 p-5 shadow-2xl"
            style={{ borderColor: "rgba(154,124,69,0.2)" }}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.18em]"
                  style={{ color: "var(--e-gold)" }}
                >
                  Tư Vấn Bất Động Sản
                </p>
                <h3 className="text-lg font-semibold" style={{ color: "var(--e-charcoal)" }}>
                  Xác nhận nội dung tin nhắn
                </h3>
                <p className="mt-1 text-sm" style={{ color: "var(--e-muted)" }}>
                  Bạn có thể chỉnh sửa nội dung trước khi gửi cho chủ sở hữu.
                </p>
              </div>
              <button
                type="button"
                onClick={closePropertyPrefill}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-white/80 text-slate-600"
                style={{ borderColor: "rgba(154,124,69,0.2)" }}
                aria-label="Đóng modal"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mb-3 rounded-lg border bg-amber-50/60 p-3 text-sm" style={{ borderColor: "rgba(201,169,110,0.32)" }}>
              <p className="font-semibold" style={{ color: "var(--e-charcoal)" }}>
                {propertyPrefill.property.title}
              </p>
              {propertyPrefill.property.address ? (
                <p className="mt-1" style={{ color: "var(--e-muted)" }}>
                  {propertyPrefill.property.address}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "var(--e-light-muted)" }}>
                {typeof propertyPrefill.property.price === "number" ? (
                  <span>
                    Giá: {new Intl.NumberFormat("vi-VN").format(propertyPrefill.property.price)}₫
                  </span>
                ) : null}
                {propertyPrefill.property.propertyType ? (
                  <span>Loại: {propertyPrefill.property.propertyType}</span>
                ) : null}
                {typeof propertyPrefill.property.bedrooms === "number" ? (
                  <span>PN: {propertyPrefill.property.bedrooms}</span>
                ) : null}
                {typeof propertyPrefill.property.bathrooms === "number" ? (
                  <span>PT: {propertyPrefill.property.bathrooms}</span>
                ) : null}
              </div>
              {propertyPrefill.property.propertyUrl ? (
                <a
                  href={propertyPrefill.property.propertyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-xs font-semibold underline"
                  style={{ color: "var(--e-charcoal)" }}
                >
                  Mở trang chi tiết bất động sản
                </a>
              ) : null}
            </div>

            <textarea
              value={prefillDraft}
              onChange={(event) => setPrefillDraft(event.target.value)}
              rows={8}
              className="w-full resize-y rounded-xl border px-3 py-2 text-sm outline-none transition-all focus:border-amber-400"
              style={{
                borderColor: "rgba(154,124,69,0.24)",
                background: "rgba(255,255,255,0.95)",
              }}
            />

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closePropertyPrefill}
                className="rounded-lg border px-4 py-2 text-sm font-semibold"
                style={{ borderColor: "rgba(154,124,69,0.24)", color: "var(--e-charcoal)" }}
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={submittingPrefill || !prefillDraft.trim()}
                onClick={async () => {
                  setSubmittingPrefill(true);
                  try {
                    await submitPropertyPrefill(prefillDraft);
                  } finally {
                    setSubmittingPrefill(false);
                  }
                }}
                className="rounded-lg border px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                style={{
                  borderColor: "rgba(37,45,54,0.35)",
                  background: "var(--e-charcoal)",
                }}
              >
                {submittingPrefill ? "Đang gửi..." : "Gửi và mở chat"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
