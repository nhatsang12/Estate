const axios = require('axios');
const ChatbotMemory = require('../models/ChatbotMemory');
const { loadChatbotKnowledge } = require('../config/chatbotKnowledgeLoader');

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const CHATBOT_SUMMARY_EVERY_TURNS = Number(process.env.CHATBOT_SUMMARY_EVERY_TURNS || 6);
const CHATBOT_RECENT_MEMORY_LIMIT = Number(process.env.CHATBOT_RECENT_MEMORY_LIMIT || 20);
const CHATBOT_RECENT_AFTER_SUMMARY = Number(process.env.CHATBOT_RECENT_AFTER_SUMMARY || 10);

const KNOWLEDGE_BASE = loadChatbotKnowledge();
const TYPE_MAP = KNOWLEDGE_BASE.propertyTypeMap || {};
const AMENITY_ALIASES = KNOWLEDGE_BASE.amenityAliasMap || {};

const resolveGeminiApiKey = () =>
  String(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();

const normalizeText = (value) => String(value || '').trim().toLowerCase();
const stripDiacritics = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
const normalizeAscii = (value) => normalizeText(stripDiacritics(value));

const uniqueStrings = (values = []) =>
  Array.from(new Set((values || []).map((value) => String(value || '').trim()).filter(Boolean)));

const normalizePropertyTypes = (types = []) => {
  const arr = Array.isArray(types) ? types : [types];
  const normalized = arr
    .map((item) => TYPE_MAP[normalizeText(item)] || normalizeText(item))
    .filter(Boolean);
  return uniqueStrings(normalized);
};

const normalizeAmenities = (amenities = []) => {
  const arr = Array.isArray(amenities) ? amenities : [amenities];
  const normalized = arr
    .map((item) => AMENITY_ALIASES[normalizeText(item)] || String(item || '').trim())
    .filter(Boolean);
  return uniqueStrings(normalized);
};

const normalizeNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return num;
};

const normalizeCriteria = (criteria = {}) => ({
  minPrice: normalizeNumber(criteria.minPrice),
  maxPrice: normalizeNumber(criteria.maxPrice),
  bedrooms: normalizeNumber(criteria.bedrooms),
  bathrooms: normalizeNumber(criteria.bathrooms),
  locationKeyword: String(criteria.locationKeyword || '').trim(),
  propertyTypes: normalizePropertyTypes(criteria.propertyTypes || []),
  amenities: normalizeAmenities(criteria.amenities || []),
  furnished: typeof criteria.furnished === 'boolean' ? criteria.furnished : null,
});

const parseVietnameseMoney = (value, unitRaw) => {
  const amount = Number(String(value || '').replace(',', '.'));
  if (!Number.isFinite(amount)) return null;
  const unit = normalizeAscii(unitRaw);
  if (unit.includes('ty') || unit.includes('ti') || unit.includes('billion')) {
    return Math.round(amount * 1_000_000_000);
  }
  if (unit.includes('trieu') || unit === 'tr' || unit.includes('million')) {
    return Math.round(amount * 1_000_000);
  }
  if (unit.includes('nghin') || unit === 'k') {
    return Math.round(amount * 1_000);
  }
  if (amount < 1_000_000) {
    // Heuristic: if no unit and too small, assume "tỷ" in real-estate context.
    return Math.round(amount * 1_000_000_000);
  }
  return Math.round(amount);
};

const extractProfileHintsFromQuestion = (question = '') => {
  const text = String(question || '').trim();
  const normalized = normalizeAscii(text);
  const hints = {
    budgetMin: null,
    budgetMax: null,
    locationKeyword: '',
    bedrooms: null,
    bathrooms: null,
    propertyTypes: [],
    amenities: [],
    furnished: null,
  };

  const bedroomMatch = normalized.match(/(\d+)\s*(phong ngu|pn|bedroom)/i);
  if (bedroomMatch) hints.bedrooms = Number(bedroomMatch[1]);

  const bathroomMatch = normalized.match(/(\d+)\s*(phong tam|pt|bathroom)/i);
  if (bathroomMatch) hints.bathrooms = Number(bathroomMatch[1]);

  const maxBudgetMatch = normalized.match(
    /(duoi|toi da|max|den|tam|khoang|ngan sach|budget)\s*(\d+(?:[.,]\d+)?)\s*(ty|ti|trieu|tr|million|billion|k|nghin)?/i
  );
  if (maxBudgetMatch) {
    const parsed = parseVietnameseMoney(maxBudgetMatch[2], maxBudgetMatch[3] || '');
    if (Number.isFinite(parsed)) hints.budgetMax = parsed;
  }

  const minBudgetMatch = normalized.match(
    /(tu|tren|it nhat|min)\s*(\d+(?:[.,]\d+)?)\s*(ty|ti|trieu|tr|million|billion|k|nghin)?/i
  );
  if (minBudgetMatch) {
    const parsed = parseVietnameseMoney(minBudgetMatch[2], minBudgetMatch[3] || '');
    if (Number.isFinite(parsed)) hints.budgetMin = parsed;
  }

  const cityMatch = normalized.match(
    /(ha noi|ho chi minh|tp hcm|thanh pho ho chi minh|da nang|quan\s*\d+|thu duc|cau giay|ba dinh|hai chau)/i
  );
  if (cityMatch) {
    hints.locationKeyword = cityMatch[1].trim();
  }

  const normalizedRaw = normalizeText(text);
  const normalizedAsciiRaw = normalizeAscii(text);
  hints.propertyTypes = normalizePropertyTypes(
    Object.keys(TYPE_MAP).filter((alias) => {
      const normalizedAlias = normalizeText(alias);
      const normalizedAsciiAlias = normalizeAscii(alias);
      return (
        (normalizedAlias && normalizedRaw.includes(normalizedAlias)) ||
        (normalizedAsciiAlias && normalizedAsciiRaw.includes(normalizedAsciiAlias))
      );
    })
  );
  hints.amenities = normalizeAmenities(
    Object.keys(AMENITY_ALIASES).filter((alias) => {
      const normalizedAlias = normalizeText(alias);
      const normalizedAsciiAlias = normalizeAscii(alias);
      return (
        (normalizedAlias && normalizedRaw.includes(normalizedAlias)) ||
        (normalizedAsciiAlias && normalizedAsciiRaw.includes(normalizedAsciiAlias))
      );
    })
  );

  const hasFurnishedTrue =
    /(co noi that|day du noi that|full noi that|noi that day du|furnished)/i.test(normalized) ||
    (normalized.includes('noi that') && normalized.includes('co'));
  const hasFurnishedFalse = /(khong noi that|nha tho|ban giao tho|unfurnished)/i.test(normalized);
  if (hasFurnishedTrue && !hasFurnishedFalse) {
    hints.furnished = true;
  } else if (hasFurnishedFalse) {
    hints.furnished = false;
  }

  return hints;
};

const getApiErrorMessage = (error) =>
  error?.response?.data?.error?.message || error?.message || 'Unknown error';

const parseGeminiText = (data) => {
  const candidate = data?.candidates?.[0];
  const parts = candidate?.content?.parts || [];
  return parts
    .map((part) => (typeof part.text === 'string' ? part.text : ''))
    .join('\n')
    .trim();
};

const callGemini = async ({ apiKey, prompt, temperature = 0.2, maxOutputTokens = 500 }) => {
  const endpoint = `${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature,
      maxOutputTokens,
      topP: 0.9,
    },
  };

  const response = await axios.post(endpoint, payload, {
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
  });
  return parseGeminiText(response.data);
};

const profileToText = (profile = {}) => {
  const lines = [];
  if (Number.isFinite(profile.budgetMin)) {
    lines.push(`Budget min: ${profile.budgetMin}`);
  }
  if (Number.isFinite(profile.budgetMax)) {
    lines.push(`Budget max: ${profile.budgetMax}`);
  }
  if (profile.locationKeyword) {
    lines.push(`Location: ${profile.locationKeyword}`);
  }
  if (Number.isFinite(profile.bedrooms)) {
    lines.push(`Bedrooms: ${profile.bedrooms}`);
  }
  if (Number.isFinite(profile.bathrooms)) {
    lines.push(`Bathrooms: ${profile.bathrooms}`);
  }
  if (Array.isArray(profile.propertyTypes) && profile.propertyTypes.length > 0) {
    lines.push(`Property types: ${profile.propertyTypes.join(', ')}`);
  }
  if (Array.isArray(profile.amenities) && profile.amenities.length > 0) {
    lines.push(`Amenities: ${profile.amenities.join(', ')}`);
  }
  if (typeof profile.furnished === 'boolean') {
    lines.push(`Furnished: ${profile.furnished ? 'yes' : 'no'}`);
  }
  return lines.join('\n');
};

const buildFallbackSummary = (previousSummary, recentMessages, profile) => {
  const profileText = profileToText(profile);
  const lastUserMessage =
    [...recentMessages].reverse().find((item) => item.role === 'user')?.content || '';
  const sections = [];
  if (previousSummary) {
    sections.push(`Summary trước đó: ${previousSummary}`);
  }
  if (profileText) {
    sections.push(`Hồ sơ nhu cầu: ${profileText}`);
  }
  if (lastUserMessage) {
    sections.push(`Câu hỏi gần nhất của khách: ${lastUserMessage}`);
  }
  return sections.join('\n').trim().slice(0, 1600);
};

const summarizeMemory = async ({ previousSummary, recentMessages, preferenceProfile }) => {
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) {
    return buildFallbackSummary(previousSummary, recentMessages, preferenceProfile);
  }

  const conversationText = recentMessages
    .map((item) => `${item.role === 'user' ? 'User' : 'Assistant'}: ${item.content}`)
    .join('\n');

  const prompt = `
Bạn đang tạo "memory summary" cho chatbot bất động sản.
Mục tiêu: tóm tắt ngắn gọn hồ sơ khách hàng để dùng cho các lượt chat sau.

Yêu cầu:
- Không markdown.
- Ưu tiên dữ kiện ổn định: ngân sách mua, khu vực, số phòng, loại BĐS, tiện ích, mục tiêu mua, các ràng buộc đã xác nhận.
- Nếu có mâu thuẫn, ưu tiên thông tin mới hơn.
- Độ dài tối đa 180 từ.

Summary trước đó:
${previousSummary || 'N/A'}

Hồ sơ nhu cầu hiện tại:
${profileToText(preferenceProfile) || 'N/A'}

Hội thoại gần đây:
${conversationText || 'N/A'}
`.trim();

  try {
    const summary = await callGemini({
      apiKey,
      prompt,
      temperature: 0.1,
      maxOutputTokens: 320,
    });
    return String(summary || '').trim().slice(0, 3000);
  } catch (error) {
    return buildFallbackSummary(previousSummary, recentMessages, preferenceProfile);
  }
};

const mergePreferenceProfile = (
  existingProfile = {},
  criteria = {},
  intent = 'unknown',
  userQuestion = ''
) => {
  const normalized = normalizeCriteria(criteria);
  const questionHints = extractProfileHintsFromQuestion(userQuestion);
  const current = existingProfile || {};

  const merged = {
    ...current,
    budgetMin:
      Number.isFinite(normalized.minPrice) && normalized.minPrice !== null
        ? normalized.minPrice
        : Number.isFinite(questionHints.budgetMin)
          ? questionHints.budgetMin
          : current.budgetMin ?? null,
    budgetMax:
      Number.isFinite(normalized.maxPrice) && normalized.maxPrice !== null
        ? normalized.maxPrice
        : Number.isFinite(questionHints.budgetMax)
          ? questionHints.budgetMax
          : current.budgetMax ?? null,
    locationKeyword:
      normalized.locationKeyword ||
      questionHints.locationKeyword ||
      current.locationKeyword ||
      '',
    bedrooms:
      Number.isFinite(normalized.bedrooms) && normalized.bedrooms !== null
        ? normalized.bedrooms
        : Number.isFinite(questionHints.bedrooms)
          ? questionHints.bedrooms
          : current.bedrooms ?? null,
    bathrooms:
      Number.isFinite(normalized.bathrooms) && normalized.bathrooms !== null
        ? normalized.bathrooms
        : Number.isFinite(questionHints.bathrooms)
          ? questionHints.bathrooms
          : current.bathrooms ?? null,
    propertyTypes: uniqueStrings([
      ...(Array.isArray(current.propertyTypes) ? current.propertyTypes : []),
      ...normalized.propertyTypes,
      ...(Array.isArray(questionHints.propertyTypes) ? questionHints.propertyTypes : []),
    ]),
    amenities: uniqueStrings([
      ...(Array.isArray(current.amenities) ? current.amenities : []),
      ...normalized.amenities,
      ...(Array.isArray(questionHints.amenities) ? questionHints.amenities : []),
    ]),
    furnished:
      typeof normalized.furnished === 'boolean'
        ? normalized.furnished
        : typeof questionHints.furnished === 'boolean'
          ? questionHints.furnished
          : typeof current.furnished === 'boolean'
            ? current.furnished
            : null,
    lastIntent: ['property', 'navigation', 'mixed'].includes(intent) ? intent : current.lastIntent || 'unknown',
    lastUpdatedAt: new Date(),
  };

  return merged;
};

const getOrCreateMemory = async (userId) => {
  const normalizedUserId = String(userId || '').trim();
  if (!normalizedUserId) {
    throw new Error('userId is required for chatbot memory');
  }

  let memory = await ChatbotMemory.findOne({ userId: normalizedUserId });
  if (!memory) {
    memory = await ChatbotMemory.create({
      userId: normalizedUserId,
      recentMessages: [],
      summary: '',
      preferenceProfile: {},
      turnsSinceSummary: 0,
    });
  }
  return memory;
};

const toPublicMemory = (memory) => ({
  summary: memory?.summary || '',
  preferenceProfile: memory?.preferenceProfile || {},
  recentMessages: Array.isArray(memory?.recentMessages) ? memory.recentMessages : [],
  turnsSinceSummary: Number(memory?.turnsSinceSummary || 0),
  updatedAt: memory?.updatedAt || null,
});

const getMemoryContextForChat = async (userId) => {
  const memory = await getOrCreateMemory(userId);
  return {
    summary: memory.summary || '',
    preferenceProfile: memory.preferenceProfile || {},
    recentMessages: Array.isArray(memory.recentMessages) ? memory.recentMessages : [],
    turnsSinceSummary: Number(memory.turnsSinceSummary || 0),
  };
};

const recordChatbotTurn = async ({
  userId,
  userQuestion,
  assistantAnswer,
  detectedCriteria = {},
  intent = 'unknown',
}) => {
  const memory = await getOrCreateMemory(userId);
  const now = new Date();

  const newMessages = [
    {
      role: 'user',
      content: String(userQuestion || '').trim().slice(0, 4000),
      createdAt: now,
    },
    {
      role: 'assistant',
      content: String(assistantAnswer || '').trim().slice(0, 4000),
      createdAt: now,
    },
  ].filter((item) => item.content.length > 0);

  let recentMessages = [
    ...(Array.isArray(memory.recentMessages) ? memory.recentMessages : []),
    ...newMessages,
  ].slice(-CHATBOT_RECENT_MEMORY_LIMIT);

  const mergedProfile = mergePreferenceProfile(
    memory.preferenceProfile || {},
    detectedCriteria || {},
    intent,
    userQuestion
  );

  let summary = memory.summary || '';
  let turnsSinceSummary = Number(memory.turnsSinceSummary || 0) + 1;

  if (turnsSinceSummary >= CHATBOT_SUMMARY_EVERY_TURNS) {
    summary = await summarizeMemory({
      previousSummary: summary,
      recentMessages,
      preferenceProfile: mergedProfile,
    });
    turnsSinceSummary = 0;
    recentMessages = recentMessages.slice(-CHATBOT_RECENT_AFTER_SUMMARY);
  }

  memory.recentMessages = recentMessages;
  memory.preferenceProfile = mergedProfile;
  memory.summary = summary;
  memory.turnsSinceSummary = turnsSinceSummary;
  await memory.save();

  return toPublicMemory(memory);
};

const clearMemory = async (userId) => {
  const memory = await getOrCreateMemory(userId);
  memory.recentMessages = [];
  memory.summary = '';
  memory.preferenceProfile = {};
  memory.turnsSinceSummary = 0;
  await memory.save();
  return toPublicMemory(memory);
};

module.exports = {
  CHATBOT_SUMMARY_EVERY_TURNS,
  clearMemory,
  getMemoryContextForChat,
  getOrCreateMemory,
  mergePreferenceProfile,
  recordChatbotTurn,
  toPublicMemory,
};
