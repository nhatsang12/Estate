const axios = require('axios');
const Property = require('../models/Property');
const { loadChatbotKnowledge } = require('../config/chatbotKnowledgeLoader');
const { buildSkillContext } = require('./chatbotAdvisorySkills');

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_EMBED_MODELS = String(
  process.env.GEMINI_EMBED_MODELS ||
    process.env.GEMINI_EMBED_MODEL ||
    'gemini-embedding-001,text-embedding-004'
)
  .split(',')
  .map((model) => model.trim())
  .filter(Boolean);
const ATLAS_SEARCH_INDEX = process.env.MONGO_SEARCH_INDEX || 'property_search';
const ATLAS_VECTOR_INDEX = process.env.MONGO_VECTOR_INDEX || 'properties_vector_index';
const ATLAS_VECTOR_PATH = process.env.MONGO_VECTOR_PATH || 'embedding';
const FRONTEND_BASE_URL = String(process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
const CHATBOT_PROPERTY_LIMIT = 6;
const capabilities = {
  checked: false,
  textSearchReady: false,
  vectorSearchReady: false,
};

const KNOWLEDGE_BASE = loadChatbotKnowledge();
const ROUTE_KNOWLEDGE = Array.isArray(KNOWLEDGE_BASE.routeKnowledge)
  ? KNOWLEDGE_BASE.routeKnowledge
  : [];
const COMMON_WORKFLOWS = Array.isArray(KNOWLEDGE_BASE.commonWorkflows)
  ? KNOWLEDGE_BASE.commonWorkflows
  : [];
const TYPE_MAP = KNOWLEDGE_BASE.propertyTypeMap || {};
const AMENITY_ALIASES = KNOWLEDGE_BASE.amenityAliasMap || {};
const NAVIGATION_GUIDE_SECTIONS = KNOWLEDGE_BASE.navigationGuideSections || [];
const ADVISORY_PLAYBOOK = KNOWLEDGE_BASE.advisoryPlaybook || {};

const NAVIGATION_KEYWORDS = [
  'đăng nhập',
  'login',
  'đăng ký',
  'register',
  'đi đâu',
  'truy cập',
  'vào trang',
  'dashboard',
  'profile',
  'subscription',
  'gói',
  'kyc',
  'hướng dẫn',
  'how to',
  'where',
  'nút nào',
  'menu',
  'route',
  'url',
];

const PROPERTY_KEYWORDS = [
  'bất động sản',
  'căn hộ',
  'nhà',
  'nhà phố',
  'villa',
  'studio',
  'office',
  'phòng ngủ',
  'bedroom',
  'bathroom',
  'giá',
  'price',
  'diện tích',
  'quận',
  'district',
  'pool',
  'amenities',
  'mua',
  'bán',
  'nội thất',
];

const DEFAULT_ADVISORY_KEYWORDS = [
  'tư vấn',
  'tu van',
  'phân tích',
  'phan tich',
  'đánh giá',
  'danh gia',
  'nên mua',
  'co nen mua',
  'rủi ro',
  'rui ro',
  'pháp lý',
  'phap ly',
  'thanh khoản',
  'thanh khoan',
  'chiến lược',
  'chien luoc',
  'so sánh',
  'so sanh',
  'phù hợp',
  'phu hop',
  'đầu tư',
  'dau tu',
];

const DEFAULT_LISTING_REQUEST_KEYWORDS = [
  'gợi ý',
  'goi y',
  'đề xuất',
  'de xuat',
  'liệt kê',
  'liet ke',
  'tìm',
  'tim',
  'show',
  'top',
  'có căn nào',
  'co can nao',
  'danh sách',
  'danh sach',
  'bất động sản nào',
  'bat dong san nao',
  'property nào',
  'property nao',
];
const CHAT_HISTORY_LIMIT = 12;
const ADVISORY_KEYWORDS = Array.isArray(ADVISORY_PLAYBOOK.advisoryKeywords)
  && ADVISORY_PLAYBOOK.advisoryKeywords.length > 0
  ? ADVISORY_PLAYBOOK.advisoryKeywords
  : DEFAULT_ADVISORY_KEYWORDS;
const LISTING_REQUEST_KEYWORDS = Array.isArray(ADVISORY_PLAYBOOK.listingRequestKeywords)
  && ADVISORY_PLAYBOOK.listingRequestKeywords.length > 0
  ? ADVISORY_PLAYBOOK.listingRequestKeywords
  : DEFAULT_LISTING_REQUEST_KEYWORDS;

const resolveGeminiApiKey = () =>
  String(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();

const getApiErrorMessage = (error) =>
  error?.response?.data?.error?.message || error?.message || 'Unknown error';

const isApiKeyError = (message) =>
  /api key/i.test(String(message || '')) &&
  /(not found|not valid|invalid|permission|unauth)/i.test(String(message || ''));

const parseGeminiText = (data) => {
  const candidate = data?.candidates?.[0];
  const parts = candidate?.content?.parts || [];
  const text = parts
    .map((part) => (typeof part.text === 'string' ? part.text : ''))
    .join('\n')
    .trim();
  return text;
};

const extractJsonFromText = (text) => {
  if (!text) return null;
  const cleaned = text.replace(/```json|```/gi, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch (innerError) {
      return null;
    }
  }
};

const normalizeText = (value) => String(value || '').trim().toLowerCase();
const stripDiacritics = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
const normalizeAscii = (value) => normalizeText(stripDiacritics(value));

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
    return Math.round(amount * 1_000_000_000);
  }
  return Math.round(amount);
};

const extractCriteriaHintsFromQuestion = (question = '') => {
  const raw = String(question || '').trim();
  const normalized = normalizeText(raw);
  const ascii = normalizeAscii(raw);

  const hints = {
    searchText: raw,
    minPrice: null,
    maxPrice: null,
    bedrooms: null,
    bathrooms: null,
    locationKeyword: '',
    propertyTypes: [],
    amenities: [],
    furnished: null,
  };

  const underBudgetMatch = ascii.match(
    /(duoi|toi da|khong qua|<=|max)\s*(\d+(?:[.,]\d+)?)\s*(ty|ti|trieu|tr|million|billion|k|nghin)?/i
  );
  if (underBudgetMatch) {
    hints.maxPrice = parseVietnameseMoney(underBudgetMatch[2], underBudgetMatch[3] || '');
  }

  const overBudgetMatch = ascii.match(
    /(tren|tu|toi thieu|>=|min)\s*(\d+(?:[.,]\d+)?)\s*(ty|ti|trieu|tr|million|billion|k|nghin)?/i
  );
  if (overBudgetMatch) {
    hints.minPrice = parseVietnameseMoney(overBudgetMatch[2], overBudgetMatch[3] || '');
  }

  const bedroomMatch = ascii.match(/(\d+)\s*(phong ngu|pn|bedroom)/i);
  if (bedroomMatch) {
    hints.bedrooms = Number(bedroomMatch[1]);
  }

  const bathroomMatch = ascii.match(/(\d+)\s*(phong tam|pt|bathroom)/i);
  if (bathroomMatch) {
    hints.bathrooms = Number(bathroomMatch[1]);
  }

  if (/(ho chi minh|tp hcm|thanh pho ho chi minh)/i.test(ascii)) {
    hints.locationKeyword = 'Hồ Chí Minh';
  } else if (/(ha noi|hanoi)/i.test(ascii)) {
    hints.locationKeyword = 'Hà Nội';
  } else if (/(da nang|danang)/i.test(ascii)) {
    hints.locationKeyword = 'Đà Nẵng';
  }

  const districtMatch = ascii.match(/\bquan\s*(\d+)\b/i);
  if (districtMatch) {
    const districtLabel = `Quận ${districtMatch[1]}`;
    hints.locationKeyword = hints.locationKeyword
      ? `${districtLabel}, ${hints.locationKeyword}`
      : districtLabel;
  }

  const typeHints = Object.entries(TYPE_MAP)
    .filter(([alias]) => {
      const normalizedAlias = normalizeText(alias);
      const asciiAlias = normalizeAscii(alias);
      return (
        (normalizedAlias && normalized.includes(normalizedAlias)) ||
        (asciiAlias && ascii.includes(asciiAlias))
      );
    })
    .map(([, canonical]) => canonical)
    .filter(Boolean);
  hints.propertyTypes = Array.from(new Set(typeHints));

  const amenityHints = Object.entries(AMENITY_ALIASES)
    .filter(([alias]) => {
      const normalizedAlias = normalizeText(alias);
      const asciiAlias = normalizeAscii(alias);
      return (
        (normalizedAlias && normalized.includes(normalizedAlias)) ||
        (asciiAlias && ascii.includes(asciiAlias))
      );
    })
    .map(([, canonical]) => canonical)
    .filter(Boolean);
  hints.amenities = Array.from(new Set(amenityHints));

  const hasFurnishedTrue =
    /(co noi that|day du noi that|full noi that|noi that day du|furnished)/i.test(ascii) ||
    (ascii.includes('noi that') && ascii.includes('co'));
  const hasFurnishedFalse = /(khong noi that|nha tho|ban giao tho|unfurnished)/i.test(ascii);
  if (hasFurnishedTrue && !hasFurnishedFalse) {
    hints.furnished = true;
  } else if (hasFurnishedFalse) {
    hints.furnished = false;
  }

  return hints;
};

const sanitizeHistory = (history = []) => {
  if (!Array.isArray(history)) return [];
  return history
    .filter((item) => item && ['user', 'assistant'].includes(item.role))
    .map((item) => ({
      role: item.role,
      content: String(item.content || '').trim(),
    }))
    .filter((item) => item.content.length > 0)
    .slice(-CHAT_HISTORY_LIMIT);
};

const buildHistoryContext = (history = []) => {
  const sanitized = sanitizeHistory(history);
  if (!sanitized.length) return '';
  return sanitized
    .map((item) => `${item.role === 'user' ? 'User' : 'Assistant'}: ${item.content}`)
    .join('\n');
};

const scoreKeywordMatches = (text, keywords = []) => {
  const haystack = normalizeText(text);
  return keywords.reduce((score, keyword) => {
    const normalizedKeyword = normalizeText(keyword);
    if (!normalizedKeyword) return score;
    return haystack.includes(normalizedKeyword) ? score + 1 : score;
  }, 0);
};

const escapeRegex = (value) =>
  String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizePropertyType = (types = []) => {
  const normalized = Array.isArray(types) ? types : [types];
  const mapped = normalized
    .map((type) => TYPE_MAP[normalizeText(type)] || TYPE_MAP[normalizeAscii(type)])
    .filter(Boolean);
  return Array.from(new Set(mapped));
};

const normalizeAmenities = (amenities = []) => {
  const normalized = Array.isArray(amenities) ? amenities : [amenities];
  const mapped = normalized
    .map((item) => AMENITY_ALIASES[normalizeText(item)] || AMENITY_ALIASES[normalizeAscii(item)] || item)
    .filter(Boolean)
    .map((item) => String(item).trim());
  return Array.from(new Set(mapped));
};

const hasNumericValue = (value) => {
  if (value === null || value === undefined || value === '') return false;
  return Number.isFinite(Number(value));
};

const mergeCriteriaWithProfile = (criteria = {}, preferenceProfile = {}) => {
  const normalizedCriteria = criteria || {};
  const profile = preferenceProfile || {};

  return {
    ...normalizedCriteria,
    minPrice:
      hasNumericValue(normalizedCriteria.minPrice)
        ? Number(normalizedCriteria.minPrice)
        : hasNumericValue(profile.budgetMin)
          ? Number(profile.budgetMin)
          : null,
    maxPrice:
      hasNumericValue(normalizedCriteria.maxPrice)
        ? Number(normalizedCriteria.maxPrice)
        : hasNumericValue(profile.budgetMax)
          ? Number(profile.budgetMax)
          : null,
    bedrooms:
      hasNumericValue(normalizedCriteria.bedrooms)
        ? Number(normalizedCriteria.bedrooms)
        : hasNumericValue(profile.bedrooms)
          ? Number(profile.bedrooms)
          : null,
    bathrooms:
      hasNumericValue(normalizedCriteria.bathrooms)
        ? Number(normalizedCriteria.bathrooms)
        : hasNumericValue(profile.bathrooms)
          ? Number(profile.bathrooms)
          : null,
    locationKeyword:
      String(normalizedCriteria.locationKeyword || '').trim() ||
      String(profile.locationKeyword || '').trim() ||
      '',
    propertyTypes: Array.from(
      new Set([
        ...normalizePropertyType(normalizedCriteria.propertyTypes || []),
        ...normalizePropertyType(profile.propertyTypes || []),
      ])
    ),
    amenities: Array.from(
      new Set([
        ...normalizeAmenities(normalizedCriteria.amenities || []),
        ...normalizeAmenities(profile.amenities || []),
      ])
    ),
    furnished:
      typeof normalizedCriteria.furnished === 'boolean'
        ? normalizedCriteria.furnished
        : typeof profile.furnished === 'boolean'
          ? profile.furnished
          : null,
  };
};

const mergeCriteriaWithQuestionHints = (criteria = {}, hints = {}) => ({
  ...criteria,
  minPrice: hasNumericValue(hints.minPrice)
    ? Number(hints.minPrice)
    : hasNumericValue(criteria.minPrice)
      ? Number(criteria.minPrice)
      : null,
  maxPrice: hasNumericValue(hints.maxPrice)
    ? Number(hints.maxPrice)
    : hasNumericValue(criteria.maxPrice)
      ? Number(criteria.maxPrice)
      : null,
  bedrooms: hasNumericValue(hints.bedrooms)
    ? Number(hints.bedrooms)
    : hasNumericValue(criteria.bedrooms)
      ? Number(criteria.bedrooms)
      : null,
  bathrooms: hasNumericValue(hints.bathrooms)
    ? Number(hints.bathrooms)
    : hasNumericValue(criteria.bathrooms)
      ? Number(criteria.bathrooms)
      : null,
  locationKeyword:
    String(hints.locationKeyword || '').trim() ||
    String(criteria.locationKeyword || '').trim() ||
    '',
  propertyTypes:
    normalizePropertyType(hints.propertyTypes || []).length > 0
      ? normalizePropertyType(hints.propertyTypes || [])
      : normalizePropertyType(criteria.propertyTypes || []),
  amenities: Array.from(
    new Set([
      ...normalizeAmenities(criteria.amenities || []),
      ...normalizeAmenities(hints.amenities || []),
    ])
  ),
  furnished:
    typeof hints.furnished === 'boolean'
      ? hints.furnished
      : typeof criteria.furnished === 'boolean'
        ? criteria.furnished
        : null,
  searchText: String(criteria.searchText || hints.searchText || '').trim(),
});

const buildMongoMatch = (criteria = {}) => {
  const match = { status: 'approved' };
  const criteriaText = normalizeAscii(criteria.searchText || '');
  const hasMinimumHint = /(it nhat|toi thieu|tro len|>=|nhieu hon|hon|tu\s+\d+)/i.test(criteriaText);

  if (Number.isFinite(criteria.minPrice)) {
    match.price = { ...(match.price || {}), $gte: Number(criteria.minPrice) };
  }
  if (Number.isFinite(criteria.maxPrice)) {
    match.price = { ...(match.price || {}), $lte: Number(criteria.maxPrice) };
  }
  if (Number.isFinite(criteria.bedrooms)) {
    match.bedrooms = hasMinimumHint ? { $gte: Number(criteria.bedrooms) } : Number(criteria.bedrooms);
  }
  if (Number.isFinite(criteria.bathrooms)) {
    match.bathrooms = hasMinimumHint ? { $gte: Number(criteria.bathrooms) } : Number(criteria.bathrooms);
  }

  const propertyTypes = normalizePropertyType(criteria.propertyTypes || []);
  if (propertyTypes.length > 0) {
    match.type = { $in: propertyTypes };
  }

  const locationKeyword = String(criteria.locationKeyword || '').trim();
  if (locationKeyword) {
    match.address = { $regex: escapeRegex(locationKeyword), $options: 'i' };
  }

  const amenities = normalizeAmenities(criteria.amenities || []);
  if (amenities.length > 0) {
    match.amenities = { $in: amenities };
  }

  if (typeof criteria.furnished === 'boolean') {
    match.furnished = criteria.furnished;
  }

  return match;
};

const detectSearchCapabilities = async () => {
  if (capabilities.checked) {
    return capabilities;
  }

  try {
    const collection = Property.collection;
    if (typeof collection.listSearchIndexes !== 'function') {
      capabilities.textSearchReady = false;
      capabilities.vectorSearchReady = false;
      capabilities.checked = true;
      return capabilities;
    }

    const indexes = await collection.listSearchIndexes().toArray();
    capabilities.textSearchReady = indexes.some((item) => item?.name === ATLAS_SEARCH_INDEX);
    capabilities.vectorSearchReady = indexes.some((item) => item?.name === ATLAS_VECTOR_INDEX);
  } catch (error) {
    capabilities.textSearchReady = false;
    capabilities.vectorSearchReady = false;
  }

  capabilities.checked = true;
  return capabilities;
};

const simplifyProperty = (property = {}) => ({
  _id: String(property._id),
  title: property.title || 'N/A',
  address: property.address || 'N/A',
  price: Number(property.price || 0),
  type: property.type || 'N/A',
  bedrooms: property.bedrooms ?? null,
  bathrooms: property.bathrooms ?? null,
  area: property.area ?? null,
  amenities: property.amenities || [],
  url: `${FRONTEND_BASE_URL}/properties/${property._id}`,
});

const heuristicallyDetectIntent = (question) => {
  const propertyScore = scoreKeywordMatches(question, PROPERTY_KEYWORDS);
  const navScore = scoreKeywordMatches(question, NAVIGATION_KEYWORDS);

  if (propertyScore > 0 && navScore > 0) return 'mixed';
  if (propertyScore > navScore) return 'property';
  if (navScore > propertyScore) return 'navigation';
  return 'property';
};

const containsAnyKeyword = (text = '', keywords = []) => {
  const asciiText = normalizeAscii(text);
  return keywords.some((keyword) => asciiText.includes(normalizeAscii(keyword)));
};

const getCriteriaSignalCount = (criteria = {}) => {
  let score = 0;
  if (Number.isFinite(Number(criteria.minPrice))) score += 1;
  if (Number.isFinite(Number(criteria.maxPrice))) score += 1;
  if (Number.isFinite(Number(criteria.bedrooms))) score += 1;
  if (Number.isFinite(Number(criteria.bathrooms))) score += 1;
  if (String(criteria.locationKeyword || '').trim()) score += 1;
  if (Array.isArray(criteria.propertyTypes) && criteria.propertyTypes.length > 0) score += 1;
  if (Array.isArray(criteria.amenities) && criteria.amenities.length > 0) score += 1;
  if (typeof criteria.furnished === 'boolean') score += 1;
  return score;
};

const resolveResponseMode = ({ question = '', intent = 'property', criteria = {} }) => {
  if (intent === 'navigation') return 'navigation';

  const listingRequested = containsAnyKeyword(question, LISTING_REQUEST_KEYWORDS);
  const advisoryRequested = containsAnyKeyword(question, ADVISORY_KEYWORDS);
  const criteriaSignalCount = getCriteriaSignalCount(criteria);

  if (advisoryRequested && listingRequested) return 'hybrid';
  if (advisoryRequested) return 'advisory';
  if (!listingRequested && criteriaSignalCount <= 1) return 'advisory';
  return 'discovery';
};

const callGemini = async ({ apiKey, prompt, temperature = 0.2, maxOutputTokens = 900 }) => {
  if (!apiKey) {
    throw new Error('Gemini API key is missing');
  }

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
    timeout: 35000,
    headers: { 'Content-Type': 'application/json' },
  });

  return parseGeminiText(response.data);
};

const createQueryEmbedding = async (apiKey, text) => {
  if (!apiKey) {
    return [];
  }

  let lastError = null;
  for (const model of GEMINI_EMBED_MODELS) {
    const endpoint = `${GEMINI_BASE_URL}/${model}:embedContent?key=${apiKey}`;
    const payload = {
      content: {
        parts: [{ text }],
      },
      taskType: 'RETRIEVAL_QUERY',
    };

    try {
      const response = await axios.post(endpoint, payload, {
        timeout: 30000,
        headers: { 'Content-Type': 'application/json' },
      });

      const values = response.data?.embedding?.values || [];
      if (Array.isArray(values) && values.length > 0) {
        return values;
      }
    } catch (error) {
      const message = getApiErrorMessage(error);
      if (isApiKeyError(message)) {
        return [];
      }
      lastError = error;
    }
  }

  if (lastError) {
    throw lastError;
  }
  return [];
};

const classifyQuestion = async (
  apiKey,
  question,
  historyContext = '',
  memorySummary = '',
  profileContext = ''
) => {
  if (!apiKey) {
    return {
      intent: heuristicallyDetectIntent(question),
      propertyCriteria: { searchText: question },
      navigationTopics: [],
    };
  }

  const prompt = `
Bạn là bộ phân loại intent cho chatbot bất động sản.
Nhiệm vụ: đọc câu hỏi và trả về JSON duy nhất (không markdown, không giải thích).
Ngữ cảnh hệ thống: website hiện tại phục vụ mua bán bất động sản (không phải thuê theo tháng).

Schema JSON:
{
  "intent": "property|navigation|mixed",
  "propertyCriteria": {
    "searchText": "string",
    "locationKeyword": "string|null",
    "bedrooms": "number|null",
    "bathrooms": "number|null",
    "minPrice": "number|null",
    "maxPrice": "number|null",
    "furnished": "boolean|null",
    "propertyTypes": ["apartment|house|villa|studio|office"],
    "amenities": ["string"]
  },
  "navigationTopics": ["string"]
}

Recent conversation history:
${historyContext || 'N/A'}

Long-term memory summary:
${memorySummary || 'N/A'}

Known customer profile:
${profileContext || 'N/A'}

Question: ${question}
`.trim();

  try {
    const raw = await callGemini({
      apiKey,
      prompt,
      temperature: 0.1,
      maxOutputTokens: 400,
    });

    const parsed = extractJsonFromText(raw);
    if (!parsed) {
      throw new Error('Cannot parse classification JSON from Gemini response');
    }

    return {
      intent: parsed.intent || heuristicallyDetectIntent(question),
      propertyCriteria: parsed.propertyCriteria || {},
      navigationTopics: Array.isArray(parsed.navigationTopics)
        ? parsed.navigationTopics
        : [],
    };
  } catch (error) {
    return {
      intent: heuristicallyDetectIntent(question),
      propertyCriteria: {
        searchText: question,
      },
      navigationTopics: [],
    };
  }
};

const runStructuredQuery = async ({ match, limit }) => {
  const properties = await Property.find(match)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return properties.map((property) => ({
    ...simplifyProperty(property),
    retrievalSource: 'structured',
    retrievalScore: 1,
  }));
};

const runAtlasSearchQuery = async ({ searchText, match, limit }) => {
  if (!searchText || !String(searchText).trim()) {
    return [];
  }

  try {
    const rows = await Property.aggregate([
      {
        $search: {
          index: ATLAS_SEARCH_INDEX,
          text: {
            query: searchText,
            path: ['title', 'description', 'address', 'amenities', 'type'],
          },
        },
      },
      { $match: match },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          title: 1,
          address: 1,
          price: 1,
          type: 1,
          bedrooms: 1,
          bathrooms: 1,
          area: 1,
          amenities: 1,
          searchScore: { $meta: 'searchScore' },
        },
      },
    ]);

    return rows.map((row) => ({
      ...simplifyProperty(row),
      retrievalSource: 'atlas_search',
      retrievalScore: Number(row.searchScore || 0) + 2,
    }));
  } catch (error) {
    return [];
  }
};

const runAtlasVectorQuery = async ({ apiKey, question, match, limit }) => {
  try {
    const hasVectorDocs = await Property.exists({ [ATLAS_VECTOR_PATH]: { $exists: true } });
    if (!hasVectorDocs) {
      return [];
    }

    const queryVector = await createQueryEmbedding(apiKey, question);
    if (!Array.isArray(queryVector) || queryVector.length === 0) {
      return [];
    }

    const rows = await Property.aggregate([
      {
        $vectorSearch: {
          index: ATLAS_VECTOR_INDEX,
          path: ATLAS_VECTOR_PATH,
          queryVector,
          numCandidates: Math.max(80, limit * 12),
          limit,
          filter: match,
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          address: 1,
          price: 1,
          type: 1,
          bedrooms: 1,
          bathrooms: 1,
          area: 1,
          amenities: 1,
          vectorScore: { $meta: 'vectorSearchScore' },
        },
      },
    ]);

    return rows.map((row) => ({
      ...simplifyProperty(row),
      retrievalSource: 'atlas_vector_search',
      retrievalScore: Number(row.vectorScore || 0) + 3,
    }));
  } catch (error) {
    return [];
  }
};

const dedupeAndRankProperties = (propertyRows = [], limit = CHATBOT_PROPERTY_LIMIT) => {
  const map = new Map();
  propertyRows.forEach((row) => {
    const id = String(row._id);
    const existing = map.get(id);
    if (!existing || Number(row.retrievalScore || 0) > Number(existing.retrievalScore || 0)) {
      map.set(id, row);
    }
  });

  return Array.from(map.values())
    .sort((a, b) => Number(b.retrievalScore || 0) - Number(a.retrievalScore || 0))
    .slice(0, limit);
};

const retrieveNavigationKnowledge = (question, topics = []) => {
  const combinedQuestion = `${question} ${topics.join(' ')}`.trim();
  const normalizedCombinedQuestion = normalizeText(combinedQuestion);

  const routeMatches = ROUTE_KNOWLEDGE.map((route) => ({
    ...route,
    relevance:
      scoreKeywordMatches(combinedQuestion, route.keywords) +
      (normalizedCombinedQuestion.includes(normalizeText(route.route)) ? 2 : 0),
  }))
    .filter((route) => route.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 5);

  const workflowMatches = COMMON_WORKFLOWS.map((workflow) => ({
    ...workflow,
    relevance: scoreKeywordMatches(combinedQuestion, workflow.keywords),
  }))
    .filter((workflow) => workflow.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 3);

  const guideSectionMatches = NAVIGATION_GUIDE_SECTIONS.map((section) => {
    const titleKeywords = String(section.title || '')
      .split(/\s+/)
      .filter(Boolean);
    const relevance =
      scoreKeywordMatches(combinedQuestion, section.keywords || []) +
      scoreKeywordMatches(combinedQuestion, titleKeywords) +
      (normalizedCombinedQuestion.includes(normalizeText(section.title)) ? 2 : 0);

    return {
      ...section,
      relevance,
    };
  })
    .filter((section) => section.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 4);

  return {
    routes: routeMatches,
    workflows: workflowMatches,
    guideSections: guideSectionMatches,
  };
};

const buildPropertyContext = (properties = []) => {
  if (!properties.length) {
    return 'Không tìm thấy bất động sản phù hợp trong dữ liệu hiện tại.';
  }
  return properties
    .map((item, index) => {
      const priceText = Number(item.price || 0).toLocaleString('vi-VN');
      return `${index + 1}. ${item.title} | ${item.address} | ${priceText} VND | ${item.type} | ${item.bedrooms ?? 'N/A'} PN | Link: ${item.url}`;
    })
    .join('\n');
};

const buildNavigationContext = (navigation = { routes: [], workflows: [], guideSections: [] }) => {
  const routeText = (navigation.routes || [])
    .map((route, index) => {
      const steps = (route.steps || []).map((step) => `- ${step}`).join('\n');
      return `${index + 1}. ${route.title} (${route.route})\nMô tả: ${route.summary}\n${steps}`;
    })
    .join('\n\n');

  const workflowText = (navigation.workflows || [])
    .map((workflow, index) => {
      const steps = (workflow.guidance || []).map((step) => `- ${step}`).join('\n');
      return `${index + 1}. ${workflow.title}\nRoutes liên quan: ${(workflow.routes || []).join(', ')}\n${steps}`;
    })
    .join('\n\n');

  const guideText = (navigation.guideSections || [])
    .map((section, index) => {
      return `${index + 1}. ${section.title}\n${section.excerpt || section.content || ''}`;
    })
    .join('\n\n');

  if (!routeText && !workflowText && !guideText) {
    return 'Không có hướng dẫn điều hướng cụ thể trong knowledge base cho câu hỏi này.';
  }

  return `Routes:\n${routeText || 'Không có'}\n\nWorkflows:\n${workflowText || 'Không có'}\n\nGuide Sections:\n${guideText || 'Không có'}`;
};

const buildFallbackAnswer = ({ intent, properties, navigation, responseMode = 'discovery' }) => {
  if (responseMode === 'advisory') {
    if (properties.length > 0) {
      return 'Mình có một số phương án phù hợp sơ bộ. Trước khi chốt căn cụ thể, mình sẽ tư vấn theo mục tiêu mua (ở thực/đầu tư), mức ngân sách an toàn và rủi ro pháp lý cần kiểm tra.';
    }
    return 'Để tư vấn sát nhu cầu hơn, bạn cho mình 3 thông tin: mục tiêu mua (ở thực hay đầu tư), ngân sách tối đa, và khu vực ưu tiên.';
  }

  if ((intent === 'property' || intent === 'mixed') && properties.length > 0) {
    return `Mình tìm thấy ${properties.length} bất động sản phù hợp. Bạn có thể xem chi tiết theo các đường dẫn được gợi ý trong kết quả.`;
  }
  if (intent === 'navigation' || intent === 'mixed') {
    const firstRoute = navigation.routes?.[0]?.route;
    if (firstRoute) {
      return `Bạn có thể bắt đầu tại route ${firstRoute}. Mình đã kèm hướng dẫn điều hướng trong phản hồi.`;
    }
  }
  return 'Mình chưa đủ dữ liệu để trả lời chính xác. Bạn có thể cung cấp thêm điều kiện hoặc mục tiêu cần thao tác trên website.';
};

const buildSuggestions = ({
  intent,
  properties,
  navigation,
  responseMode = 'discovery',
  skillSuggestedQuestions = [],
}) => {
  const suggestions = [];
  const pushSuggestion = (value) => {
    const text = String(value || '').trim();
    if (!text) return;
    if (suggestions.includes(text)) return;
    suggestions.push(text);
  };

  if (responseMode === 'advisory') {
    skillSuggestedQuestions.forEach((item) => pushSuggestion(item));
    if (!suggestions.length) {
      pushSuggestion('Bạn đang ưu tiên mua để ở hay mua để đầu tư tăng giá?');
      pushSuggestion('Ngân sách tối đa bạn có thể chốt là bao nhiêu tỷ?');
      if (properties.length > 0) {
        pushSuggestion('Nếu muốn, mình có thể phân tích sâu 1 căn cụ thể về pháp lý, vị trí và thanh khoản.');
      } else {
        pushSuggestion('Bạn ưu tiên khu vực nào và số phòng ngủ tối thiểu là bao nhiêu?');
      }
    }
    return suggestions.slice(0, 3);
  }

  if (intent === 'property' || intent === 'mixed') {
    if (properties.length > 0) {
      pushSuggestion('Bạn muốn mình so sánh nhanh căn này với 2-3 bất động sản tương đương cùng khu vực không?');
      pushSuggestion(`Bạn có thể mở nhanh căn đầu tiên tại: ${properties[0].url}`);
      pushSuggestion('Nếu cần lọc sâu hơn, bạn cho mình thêm quận/phường ưu tiên và số phòng ngủ mong muốn.');
    } else {
      pushSuggestion('Cho mình ngân sách mua dự kiến (ví dụ: dưới 20 tỷ) để lọc chính xác hơn.');
      pushSuggestion('Bạn muốn ưu tiên khu vực nào tại TP.HCM (quận/phường cụ thể)?');
      pushSuggestion('Bạn cần loại BĐS nào (căn hộ/nhà phố/biệt thự), mấy phòng ngủ và có nội thất không?');
    }
  }

  if (intent === 'navigation' || intent === 'mixed') {
    if (navigation.routes?.[0]?.route) {
      pushSuggestion(`Route phù hợp nhất hiện tại: ${navigation.routes[0].route}`);
    }
    pushSuggestion('Nếu bạn muốn, mình có thể hướng dẫn chi tiết theo từng bước thao tác trên giao diện.');
  }

  if (!properties.length && (intent === 'property' || intent === 'mixed')) {
    pushSuggestion('Nếu chưa có kết quả phù hợp, bạn thử nới điều kiện giá hoặc mở rộng khu vực.');
  }

  return suggestions.slice(0, 3);
};

const formatPriceVnd = (value) => `${Number(value || 0).toLocaleString('vi-VN')} VND`;

const toChatPlainText = (value) => {
  if (!value) return '';
  return String(value)
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^\s*\*\s+/gm, '- ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const buildPropertyDetailLines = (properties = []) => {
  if (!properties.length) return [];
  return properties.slice(0, 5).map((item, index) => {
    const parts = [
      `${index + 1}. ${item.title || 'N/A'}`,
      `Khu vực: ${item.address || 'N/A'}`,
      `Giá: ${formatPriceVnd(item.price)}`,
      `Loại: ${item.type || 'N/A'}`,
      `PN/PT: ${item.bedrooms ?? 'N/A'}/${item.bathrooms ?? 'N/A'}`,
      `Chi tiết: ${item.url}`,
    ];
    return parts.join(' | ');
  });
};

const extractPropertyIdFromUrl = (url = '') => {
  const match = String(url || '').match(/\/properties\/([a-f0-9]{24})/i);
  return match?.[1] ? String(match[1]) : '';
};

const extractReferencedIndex = (question = '') => {
  const ascii = normalizeAscii(question);
  const patterns = [
    /\b(?:so|số)\s*(\d+)\b/i,
    /\b(?:thu\s*tu|thứ\s*tự)\s*(\d+)\b/i,
    /\bitem\s*(\d+)\b/i,
    /\bcan\s*(\d+)\b/i,
  ];
  for (const pattern of patterns) {
    const match = ascii.match(pattern);
    if (match?.[1]) {
      const index = Number(match[1]);
      if (Number.isFinite(index) && index > 0) return index;
    }
  }
  return null;
};

const parseIndexedPropertyUrlsFromAnswer = (text = '') => {
  const lines = String(text || '').split(/\r?\n/);
  const map = new Map();

  lines.forEach((line) => {
    const match = line.match(/^\s*(\d+)\.\s.*?Chi tiết:\s*(\S+)/i);
    if (!match) return;
    const index = Number(match[1]);
    const propertyId = extractPropertyIdFromUrl(match[2]);
    if (!Number.isFinite(index) || index <= 0 || !propertyId) return;
    map.set(index, propertyId);
  });

  return map;
};

const resolveReferencedPropertyFromHistory = async (question = '', history = []) => {
  const targetIndex = extractReferencedIndex(question);
  if (!targetIndex) return null;

  const assistantTurns = sanitizeHistory(history)
    .filter((item) => item.role === 'assistant')
    .reverse();

  for (const turn of assistantTurns) {
    const indexedMap = parseIndexedPropertyUrlsFromAnswer(turn.content || '');
    if (!indexedMap.size || !indexedMap.has(targetIndex)) continue;

    const propertyId = indexedMap.get(targetIndex);
    if (!propertyId) continue;

    const property = await Property.findById(propertyId).lean();
    if (!property || property.status !== 'approved') continue;

    return {
      property: simplifyProperty(property),
      referenceIndex: targetIndex,
    };
  }

  return null;
};

const buildFocusedPropertyAdvice = ({ property, referenceIndex }) => {
  if (!property) return '';
  const head = referenceIndex
    ? `Mình tư vấn nhanh cho bất động sản số ${referenceIndex} bạn vừa chọn:`
    : 'Mình tư vấn nhanh cho bất động sản bạn vừa chọn:';

  const advisoryNotes = [
    '- Điểm phù hợp: cần đối chiếu ngân sách, nhu cầu ở thực hay đầu tư, và kỳ vọng thanh khoản.',
    '- Điểm cần kiểm tra trước khi chốt: pháp lý sổ, quy hoạch khu vực, chất lượng xây dựng và hạ tầng kết nối.',
    '- Bước tiếp theo nên làm: đi xem thực tế + so sánh thêm 2 căn tương đương cùng khu vực để định giá tốt hơn.',
  ];

  return [
    head,
    `${property.title} | Khu vực: ${property.address || 'N/A'} | Giá: ${formatPriceVnd(property.price)} | Loại: ${property.type || 'N/A'} | PN/PT: ${property.bedrooms ?? 'N/A'}/${property.bathrooms ?? 'N/A'} | Chi tiết: ${property.url}`,
    'Nhận định tư vấn:',
    ...advisoryNotes,
    'Nếu bạn muốn, mình sẽ phân tích sâu tiếp theo mục tiêu của bạn (ở thực hay đầu tư) để ra quyết định phù hợp hơn.',
  ]
    .join('\n\n')
    .trim();
};

const buildNavigationDetailLines = (navigation = { routes: [], workflows: [], guideSections: [] }) => {
  const lines = [];
  const routes = navigation.routes || [];
  const workflows = navigation.workflows || [];
  const guideSections = navigation.guideSections || [];

  if (routes.length > 0) {
    lines.push('Các route phù hợp:');
    routes.slice(0, 3).forEach((route, index) => {
      lines.push(`${index + 1}. ${route.title} (${route.route})`);
      (route.steps || []).slice(0, 3).forEach((step) => {
        lines.push(`- ${step}`);
      });
    });
  }

  if (workflows.length > 0) {
    lines.push('Quy trình gợi ý:');
    workflows.slice(0, 2).forEach((workflow, index) => {
      lines.push(`${index + 1}. ${workflow.title} | Routes: ${(workflow.routes || []).join(', ') || 'N/A'}`);
      (workflow.guidance || []).slice(0, 3).forEach((step) => {
        lines.push(`- ${step}`);
      });
    });
  }

  if (guideSections.length > 0) {
    lines.push('Hướng dẫn từ tài liệu web_navigation_guide.md:');
    guideSections.slice(0, 2).forEach((section, index) => {
      lines.push(`${index + 1}. ${section.title}`);
      lines.push(section.excerpt || section.content || '');
    });
  }

  return lines;
};

const buildSingleNavigationResult = (navigation = { routes: [], workflows: [], guideSections: [] }) => {
  const route = navigation.routes?.[0];
  if (route) {
    const steps = (route.steps || []).slice(0, 3);
    return [
      `Bạn có thể vào: ${route.route}`,
      ...steps.map((step, index) => `${index + 1}. ${step}`),
    ]
      .join('\n')
      .trim();
  }

  const workflow = navigation.workflows?.[0];
  if (workflow) {
    const firstRoute = workflow.routes?.[0];
    const steps = (workflow.guidance || []).slice(0, 3);
    const header = firstRoute
      ? `Bạn có thể bắt đầu tại: ${firstRoute}`
      : `Bạn có thể làm theo hướng dẫn: ${workflow.title}`;
    return [header, ...steps.map((step, index) => `${index + 1}. ${step}`)]
      .join('\n')
      .trim();
  }

  const section = navigation.guideSections?.[0];
  if (section) {
    return `${section.title}\n${section.excerpt || ''}`.trim();
  }

  return 'Mình chưa tìm thấy route phù hợp. Bạn nói rõ hơn mục tiêu cần thao tác nhé.';
};

const buildEnrichedAnswer = ({
  answerText,
  intent,
  properties,
  navigation,
  suggestions,
  responseMode = 'discovery',
  shouldAutoList = true,
}) => {
  const normalized = toChatPlainText(answerText);
  const sections = [];
  const normalizedUrlCount = (normalized.match(/https?:\/\/\S+/g) || []).length;

  if (intent === 'navigation') {
    const concise = normalized || buildSingleNavigationResult(navigation);
    return concise.trim();
  }

  if (responseMode === 'advisory') {
    if (normalized) {
      const advisorySections = [normalized];
      if (Array.isArray(suggestions) && suggestions.length > 0) {
        advisorySections.push('Gợi ý tiếp theo:');
        suggestions.slice(0, 3).forEach((item, index) => {
          advisorySections.push(`${index + 1}. ${toChatPlainText(item)}`);
        });
      }
      return advisorySections.join('\n\n').trim();
    }
    return 'Để tư vấn chính xác hơn, bạn cho mình mục tiêu mua (ở thực hay đầu tư), ngân sách tối đa và khu vực ưu tiên nhé.';
  }

  if (intent === 'property' && properties.length > 0 && shouldAutoList) {
    const propertyOnlySections = [
      `Mình đã tìm thấy ${properties.length} bất động sản phù hợp với nhu cầu hiện tại của bạn.`,
      'Bất động sản gợi ý:',
      ...buildPropertyDetailLines(properties),
    ];

    if (Array.isArray(suggestions) && suggestions.length > 0) {
      propertyOnlySections.push('Gợi ý tiếp theo:');
      suggestions.slice(0, 3).forEach((item, index) => {
        propertyOnlySections.push(`${index + 1}. ${toChatPlainText(item)}`);
      });
    }

    return propertyOnlySections.join('\n\n').trim();
  }

  if (normalized) {
    sections.push(normalized);
  }

  if (
    shouldAutoList &&
    (intent === 'property' || intent === 'mixed') &&
    properties.length > 0 &&
    normalizedUrlCount < 2
  ) {
    sections.push('Bất động sản gợi ý:');
    sections.push(...buildPropertyDetailLines(properties));
  }

  if ((intent === 'navigation' || intent === 'mixed')) {
    const navLines = buildNavigationDetailLines(navigation);
    if (navLines.length > 0) {
      sections.push(...navLines);
    }
  }

  if (Array.isArray(suggestions) && suggestions.length > 0) {
    sections.push('Gợi ý tiếp theo:');
    suggestions.slice(0, 3).forEach((item, index) => {
      sections.push(`${index + 1}. ${toChatPlainText(item)}`);
    });
  }

  const combined = sections.join('\n\n').trim();
  return combined || normalized || 'Mình chưa có đủ dữ liệu để tư vấn lúc này.';
};

const mergeSkillOverlayIntoAnswer = ({
  answer = '',
  skillContext = {},
  responseMode = 'discovery',
}) => {
  const base = String(answer || '').trim();
  if (!base) return base;

  if (responseMode !== 'advisory' && responseMode !== 'hybrid') {
    return base;
  }

  const overlay = String(skillContext?.advisoryOverlay || '').trim();
  if (!overlay) return base;

  const normalized = normalizeAscii(base);
  const alreadyInjected =
    normalized.includes('khung tu van mua bds') || normalized.includes('checklist phap ly');
  if (alreadyInjected) return base;

  return `${overlay}\n\n${base}`.trim();
};

const answerQuestion = async ({ question, history = [], memorySummary = '', preferenceProfile = {}, user }) => {
  const apiKey = resolveGeminiApiKey();

  const normalizedQuestion = String(question || '').trim();
  if (!normalizedQuestion) {
    throw new Error('Question is required');
  }

  const historyContext = buildHistoryContext(history);
  const normalizedMemorySummary = String(memorySummary || '').trim();
  const profileContext = toChatPlainText(JSON.stringify(preferenceProfile || {}, null, 2));

  const referencedProperty = await resolveReferencedPropertyFromHistory(
    normalizedQuestion,
    history
  );
  if (referencedProperty?.property) {
    const focusedSkillContext = buildSkillContext({
      question: normalizedQuestion,
      responseMode: 'advisory',
      criteria: {},
      preferenceProfile: preferenceProfile || {},
      properties: [referencedProperty.property],
    });

    const focusedAnswer = mergeSkillOverlayIntoAnswer({
      answer: buildFocusedPropertyAdvice(referencedProperty),
      skillContext: focusedSkillContext,
      responseMode: 'advisory',
    });

    const focusedSuggestions = [
      ...(Array.isArray(focusedSkillContext.suggestedQuestions)
        ? focusedSkillContext.suggestedQuestions
        : []),
      `Xem chi tiết bất động sản: ${referencedProperty.property.url}`,
      'Bạn muốn mình phân tích thêm pháp lý, vị trí hay tiềm năng tăng giá của căn này?',
      'Mình có thể gợi ý thêm 2-3 căn tương tự để bạn so sánh trước khi quyết định mua.',
    ].filter((item, index, arr) => item && arr.indexOf(item) === index).slice(0, 3);

    return {
      answer: focusedAnswer,
      intent: 'property',
      properties: [referencedProperty.property],
      navigation: {
        routes: [],
        workflows: [],
        guideSections: [],
      },
      suggestions: focusedSuggestions,
      metadata: {
        usedAtlasSearch: false,
        usedVectorSearch: false,
        llmEnabled: Boolean(apiKey),
        usedHistoryTurns: sanitizeHistory(history).length,
        responseMode: 'advisory',
        shouldAutoList: false,
        advisorySkills: focusedSkillContext.appliedSkills || ['advisory_consulting'],
        legalRequested: Boolean(focusedSkillContext.legalRequested),
        resolvedFromHistoryReference: true,
        timestamp: new Date().toISOString(),
      },
      detectedCriteria: {
        searchText: normalizedQuestion,
        referencedIndex: referencedProperty.referenceIndex || null,
      },
      createdAt: new Date().toISOString(),
    };
  }

  const classification = await classifyQuestion(
    apiKey,
    normalizedQuestion,
    historyContext,
    normalizedMemorySummary,
    profileContext
  );
  const questionHints = extractCriteriaHintsFromQuestion(normalizedQuestion);
  const intent = ['property', 'navigation', 'mixed'].includes(classification.intent)
    ? classification.intent
    : heuristicallyDetectIntent(normalizedQuestion);
  const mergedWithProfile = mergeCriteriaWithProfile(
    classification.propertyCriteria || {},
    preferenceProfile || {}
  );
  const propertyCriteria = mergeCriteriaWithQuestionHints(mergedWithProfile, questionHints);
  const responseMode = resolveResponseMode({
    question: normalizedQuestion,
    intent,
    criteria: propertyCriteria,
  });
  const shouldAutoList = responseMode === 'discovery' || responseMode === 'hybrid';
  const navigationTopics = classification.navigationTopics || [];

  let properties = [];
  let usedAtlasSearch = false;
  let usedVectorSearch = false;

  if (intent === 'property' || intent === 'mixed') {
    const searchCapabilities = await detectSearchCapabilities();
    const match = buildMongoMatch(propertyCriteria);
    const searchText =
      String(propertyCriteria.searchText || '').trim() || normalizedQuestion;

    const [structuredRows, atlasSearchRows, vectorRows] = await Promise.all([
      runStructuredQuery({ match, limit: CHATBOT_PROPERTY_LIMIT }),
      searchCapabilities.textSearchReady
        ? runAtlasSearchQuery({ searchText, match, limit: CHATBOT_PROPERTY_LIMIT })
        : Promise.resolve([]),
      searchCapabilities.vectorSearchReady && Boolean(apiKey)
        ? runAtlasVectorQuery({
            apiKey,
            question: normalizedQuestion,
            match,
            limit: CHATBOT_PROPERTY_LIMIT,
          })
        : Promise.resolve([]),
    ]);

    usedAtlasSearch = atlasSearchRows.length > 0;
    usedVectorSearch = vectorRows.length > 0;

    properties = dedupeAndRankProperties(
      [...vectorRows, ...atlasSearchRows, ...structuredRows],
      CHATBOT_PROPERTY_LIMIT
    );
  }

  const navigation = retrieveNavigationKnowledge(normalizedQuestion, navigationTopics);
  const propertyContext = buildPropertyContext(properties);
  const navigationContext = buildNavigationContext(navigation);
  const skillContext = buildSkillContext({
    question: normalizedQuestion,
    responseMode,
    criteria: propertyCriteria,
    preferenceProfile: preferenceProfile || {},
    properties,
  });

  const advisorySkillPromptContext = String(skillContext.promptContext || '').trim() || 'N/A';
  const responseModeGuidance =
    responseMode === 'advisory'
      ? [
          '- Bạn đang ở chế độ tư vấn. Không tự động liệt kê danh sách dài bất động sản nếu user không yêu cầu rõ.',
          '- Trả lời theo vai trò chuyên viên tư vấn mua bán: phân tích nhu cầu, rủi ro, pháp lý, thanh khoản, và bước ra quyết định.',
          '- Chỉ nêu tối đa 1-2 ví dụ bất động sản nếu thực sự cần minh hoạ cho tư vấn.',
          '- Kết thúc bằng 1 câu hỏi làm rõ quan trọng nhất để tiếp tục tư vấn.',
        ].join('\n')
      : responseMode === 'hybrid'
        ? [
            '- Bạn đang ở chế độ kết hợp tư vấn + gợi ý.',
            '- Trước tiên tư vấn ngắn theo nhu cầu, sau đó mới liệt kê tối đa 3 bất động sản phù hợp.',
          ].join('\n')
        : [
            '- Bạn đang ở chế độ tìm kiếm/gợi ý.',
          '- Nếu có kết quả phù hợp, liệt kê 3-5 bất động sản đầu tiên, mỗi dòng gồm tên, địa chỉ, giá, loại, PN/PT và link.',
        ].join('\n');
  const skillGuidance = Array.isArray(skillContext.appliedSkills) && skillContext.appliedSkills.length > 0
    ? `- Bắt buộc áp dụng các skill tư vấn đang bật: ${skillContext.appliedSkills.join(', ')}.`
    : '- Không có skill tư vấn bổ sung bắt buộc cho câu hỏi này.';

  const answerPrompt = `
Bạn là trợ lý AI cho website EstateManager.
Yêu cầu:
- Trả lời rõ ràng, chuyên nghiệp, đầy đủ thông tin, không dùng emoji.
- Không dùng markdown (không dùng ký tự định dạng như dấu sao kép, heading, code block).
- Đây là nền tảng mua bán bất động sản, không phải nền tảng cho thuê theo tháng.
- Nếu chưa đủ điều kiện lọc: hỏi thêm tối đa 2 câu để làm rõ (ngân sách mua, khu vực, số phòng).
- Nếu câu hỏi điều hướng web: hướng dẫn theo từng bước, nêu route cụ thể.
- Nếu câu hỏi điều hướng web: chỉ đưa ra 1 phương án phù hợp nhất (1 route chính), không liệt kê nhiều route.
- Không thêm các tiêu đề như "Các route phù hợp", "Hướng dẫn từ tài liệu", "Gợi ý tiếp theo" trong câu trả lời điều hướng.
- Nếu là câu hỏi mixed: trả lời cả phần bất động sản và điều hướng.
- Trả lời cùng ngôn ngữ với câu hỏi của user.
${responseModeGuidance}
${skillGuidance}

Question:
${normalizedQuestion}

Recent conversation history:
${historyContext || 'N/A'}

Long-term memory summary:
${normalizedMemorySummary || 'N/A'}

Known customer profile:
${profileContext || 'N/A'}

User role:
${user?.role || 'guest'}

Intent:
${intent}

Response mode:
${responseMode}

Property retrieval context:
${propertyContext}

Website navigation knowledge context:
${navigationContext}

Advisory/legal skill context:
${advisorySkillPromptContext}
`.trim();

  let answerText = '';
  if (apiKey) {
    try {
      answerText = await callGemini({
        apiKey,
        prompt: answerPrompt,
        temperature: 0.25,
        maxOutputTokens: 1400,
      });
    } catch (error) {
      answerText = '';
    }
  }

  const rawAnswerBase =
    answerText || buildFallbackAnswer({ intent, properties, navigation, responseMode });
  const rawAnswer = mergeSkillOverlayIntoAnswer({
    answer: rawAnswerBase,
    skillContext,
    responseMode,
  });
  const suggestions = buildSuggestions({
    intent,
    properties,
    navigation,
    responseMode,
    skillSuggestedQuestions: skillContext.suggestedQuestions || [],
  });
  const finalAnswerBase = buildEnrichedAnswer({
    answerText: rawAnswer,
    intent,
    properties,
    navigation,
    suggestions,
    responseMode,
    shouldAutoList,
  });
  const finalAnswer = mergeSkillOverlayIntoAnswer({
    answer: finalAnswerBase,
    skillContext,
    responseMode,
  });

  return {
    answer: finalAnswer,
    intent,
    properties,
    navigation: {
      routes: (navigation.routes || []).map((route) => ({
        route: route.route,
        title: route.title,
        summary: route.summary,
        steps: route.steps || [],
      })),
      workflows: (navigation.workflows || []).map((workflow) => ({
        title: workflow.title,
        routes: workflow.routes || [],
        guidance: workflow.guidance || [],
      })),
      guideSections: (navigation.guideSections || []).map((section) => ({
        title: section.title,
        excerpt: section.excerpt || '',
      })),
    },
    suggestions,
    metadata: {
      usedAtlasSearch,
      usedVectorSearch,
      llmEnabled: Boolean(apiKey),
      usedHistoryTurns: sanitizeHistory(history).length,
      responseMode,
      shouldAutoList,
      advisorySkills: skillContext.appliedSkills || [],
      legalRequested: Boolean(skillContext.legalRequested),
      timestamp: new Date().toISOString(),
    },
    detectedCriteria: propertyCriteria,
    createdAt: new Date().toISOString(),
  };
};

module.exports = {
  answerQuestion,
};
