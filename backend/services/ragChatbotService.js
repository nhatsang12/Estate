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
const LEGAL_CHECKLIST = KNOWLEDGE_BASE.legalChecklist || {};
const BOT_IDENTITY = KNOWLEDGE_BASE.botIdentity || {};

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
const DEFAULT_LEGAL_INTENT_KEYWORDS = [
  'phap ly',
  'pháp lý',
  'hop dong',
  'hợp đồng',
  'sổ đỏ',
  'so do',
  'sổ hồng',
  'so hong',
  'công chứng',
  'cong chung',
  'sang tên',
  'sang ten',
  'đặt cọc',
  'dat coc',
];
const LOCATION_POTENTIAL_KEYWORDS = [
  'tiem nang',
  'tiềm năng',
  'phat trien',
  'phát triển',
  'quy hoach',
  'quy hoạch',
  'ha tang',
  'hạ tầng',
  'thanh khoan khu vuc',
  'thanh khoản khu vực',
  'khu vuc nay',
  'khu vực này',
  'vi tri nay',
  'vị trí này',
];
const FINANCING_KEYWORDS = [
  'vay',
  'ngan hang',
  'ngân hàng',
  'lai suat',
  'lãi suất',
  'tra gop',
  'trả góp',
  'dong tien',
  'dòng tiền',
  'don bay',
  'đòn bẩy',
];
const PROPERTY_REFERENCE_KEYWORDS = [
  'can so',
  'căn số',
  'can nay',
  'căn này',
  'bds nay',
  'bđs này',
  'bat dong san nay',
  'bất động sản này',
  'nha nay',
  'nhà này',
];
const CHATBOT_EXPOSE_SKILL_OVERLAY =
  String(process.env.CHATBOT_EXPOSE_SKILL_OVERLAY || 'false').trim().toLowerCase() === 'true';
const CHAT_HISTORY_LIMIT = 12;
const ADVISORY_KEYWORDS = Array.isArray(ADVISORY_PLAYBOOK.advisoryKeywords)
  && ADVISORY_PLAYBOOK.advisoryKeywords.length > 0
  ? ADVISORY_PLAYBOOK.advisoryKeywords
  : DEFAULT_ADVISORY_KEYWORDS;
const LISTING_REQUEST_KEYWORDS = Array.isArray(ADVISORY_PLAYBOOK.listingRequestKeywords)
  && ADVISORY_PLAYBOOK.listingRequestKeywords.length > 0
  ? ADVISORY_PLAYBOOK.listingRequestKeywords
  : DEFAULT_LISTING_REQUEST_KEYWORDS;
const LEGAL_INTENT_KEYWORDS = Array.isArray(LEGAL_CHECKLIST.legalKeywords) && LEGAL_CHECKLIST.legalKeywords.length > 0
  ? LEGAL_CHECKLIST.legalKeywords
  : DEFAULT_LEGAL_INTENT_KEYWORDS;
const DEFAULT_ADVISORY_ESCALATION = {
  maxClarifyingQuestions: 2,
  strategy: 'ask_then_handoff',
  insufficientDataSignal:
    'Nếu thiếu dữ liệu sau số lượt hỏi làm rõ tối đa, Clara phải chủ động đề xuất chuyển tư vấn viên người thật.',
  humanHandoffRoute: '/contact-support',
  humanHandoffMessage:
    'Nếu sau 2 lượt làm rõ mà vẫn chưa đủ dữ liệu để kết luận, mình sẽ đề xuất chuyển bạn sang tư vấn viên người thật.',
};
const ADVISORY_ESCALATION = {
  ...DEFAULT_ADVISORY_ESCALATION,
  ...(ADVISORY_PLAYBOOK.escalation || {}),
};
const ADVISORY_MAX_CLARIFYING_QUESTIONS = Math.max(
  1,
  Number.parseInt(String(ADVISORY_ESCALATION.maxClarifyingQuestions || 2), 10) || 2
);
const ADVISORY_ESCALATION_ROUTE = String(ADVISORY_ESCALATION.humanHandoffRoute || '').trim();
const ADVISORY_ESCALATION_MESSAGE =
  String(ADVISORY_ESCALATION.humanHandoffMessage || '').trim() ||
  DEFAULT_ADVISORY_ESCALATION.humanHandoffMessage;
const DEFAULT_BOT_IDENTITY = {
  name: 'Clara',
  displayName: 'Clara',
  gender: 'female',
  pronouns: 'mình - bạn',
  role: 'AI tư vấn mua bán bất động sản',
  personalityTraits: ['ấm áp', 'điềm tĩnh', 'thực tế'],
  conversationPrinciples: [
    'Ưu tiên trả lời rõ ràng, tự nhiên, đúng trọng tâm nhu cầu mua bán.',
    'Không lặp lại câu hỏi cũ khi người dùng đã cung cấp câu trả lời.',
    'Kết thúc bằng một câu hỏi ngắn giúp người dùng ra quyết định tiếp theo.',
  ],
  doNot: ['Không xưng hô hành chính cứng nhắc', 'Không trả lời lan man'],
};
const BOT_PROFILE = {
  ...DEFAULT_BOT_IDENTITY,
  ...BOT_IDENTITY,
  personalityTraits:
    Array.isArray(BOT_IDENTITY.personalityTraits) && BOT_IDENTITY.personalityTraits.length > 0
      ? BOT_IDENTITY.personalityTraits
      : DEFAULT_BOT_IDENTITY.personalityTraits,
  conversationPrinciples:
    Array.isArray(BOT_IDENTITY.conversationPrinciples) && BOT_IDENTITY.conversationPrinciples.length > 0
      ? BOT_IDENTITY.conversationPrinciples
      : DEFAULT_BOT_IDENTITY.conversationPrinciples,
  doNot:
    Array.isArray(BOT_IDENTITY.doNot) && BOT_IDENTITY.doNot.length > 0
      ? BOT_IDENTITY.doNot
      : DEFAULT_BOT_IDENTITY.doNot,
};

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

const buildBotIdentityContext = () => {
  const name = String(BOT_PROFILE.displayName || BOT_PROFILE.name || 'Clara').trim() || 'Clara';
  const gender = String(BOT_PROFILE.gender || 'female').trim() || 'female';
  const pronouns = String(BOT_PROFILE.pronouns || 'mình - bạn').trim() || 'mình - bạn';
  const role = String(BOT_PROFILE.role || 'AI tư vấn mua bán bất động sản').trim();
  const personalityTraits = Array.isArray(BOT_PROFILE.personalityTraits)
    ? BOT_PROFILE.personalityTraits.filter(Boolean).slice(0, 6)
    : [];
  const conversationPrinciples = Array.isArray(BOT_PROFILE.conversationPrinciples)
    ? BOT_PROFILE.conversationPrinciples.filter(Boolean).slice(0, 8)
    : [];
  const doNot = Array.isArray(BOT_PROFILE.doNot)
    ? BOT_PROFILE.doNot.filter(Boolean).slice(0, 6)
    : [];

  const lines = [
    `- Tên bot: ${name}`,
    `- Giới tính/persona: ${gender}`,
    `- Vai trò: ${role}`,
    `- Cách xưng hô ưu tiên: ${pronouns}`,
  ];

  if (personalityTraits.length > 0) {
    lines.push(`- Tính cách cốt lõi: ${personalityTraits.join(', ')}`);
  }

  if (conversationPrinciples.length > 0) {
    lines.push('- Nguyên tắc hội thoại:');
    conversationPrinciples.forEach((item) => lines.push(`  ${item}`));
  }

  if (doNot.length > 0) {
    lines.push(`- Không được làm: ${doNot.join(' | ')}`);
  }

  lines.push(`- Nếu người dùng hỏi "bạn tên gì", phải trả lời: "${name}".`);
  return lines.join('\n');
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

const hasBudgetCriteria = (criteria = {}) =>
  Number.isFinite(Number(criteria.minPrice)) || Number.isFinite(Number(criteria.maxPrice));

const detectSuggestionFocus = ({ question = '', intent = 'property' } = {}) => {
  const asciiQuestion = normalizeAscii(question);
  const asksLegal = containsAnyKeyword(asciiQuestion, LEGAL_INTENT_KEYWORDS);
  const asksLocationPotential = containsAnyKeyword(asciiQuestion, LOCATION_POTENTIAL_KEYWORDS);
  const asksFinance = containsAnyKeyword(asciiQuestion, FINANCING_KEYWORDS);
  const asksComparison = containsAnyKeyword(asciiQuestion, [
    'so sanh',
    'đối chiếu',
    'doi chieu',
    'canh voi',
    'cạnh với',
    'tuong duong',
    'tương đương',
  ]);
  const pointsToSpecificProperty =
    containsAnyKeyword(asciiQuestion, PROPERTY_REFERENCE_KEYWORDS) ||
    /\b(can|bds|bat dong san|nha)\s*(so\s*)?\d+\b/i.test(asciiQuestion);

  return {
    asksLegal,
    asksLocationPotential,
    asksFinance,
    asksComparison,
    pointsToSpecificProperty,
    isNavigationOnly: intent === 'navigation',
  };
};

const filterQuestionsByKnownCriteria = ({ questions = [], criteria = {} } = {}) => {
  const hasBudget = hasBudgetCriteria(criteria);
  const hasLocation = Boolean(String(criteria.locationKeyword || '').trim());
  const hasType = normalizePropertyType(criteria.propertyTypes || []).length > 0;
  const hasBedrooms = Number.isFinite(Number(criteria.bedrooms));
  const hasBathrooms = Number.isFinite(Number(criteria.bathrooms));
  const hasFurnished = typeof criteria.furnished === 'boolean';

  return questions
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .filter((item, index, arr) => arr.indexOf(item) === index)
    .filter((item) => {
      const normalized = normalizeAscii(item);
      if (hasBudget && /(ngan sach|ngân sách|bao nhieu ty|bao nhiêu tỷ|toi da|max|min|gia tran|trần ngân sách)/i.test(normalized)) {
        return false;
      }
      if (hasLocation && /(khu vuc|khu vực|quan|quận|phuong|phường|vi tri|vị trí|dia diem|địa điểm)/i.test(normalized)) {
        return false;
      }
      if (hasType && /(loai bds|loại bđs|can ho|căn hộ|nha pho|nhà phố|biet thu|biệt thự|van phong|văn phòng)/i.test(normalized)) {
        return false;
      }
      if (hasBedrooms && /(phong ngu|phòng ngủ|pn)/i.test(normalized)) {
        return false;
      }
      if (hasBathrooms && /(phong tam|phòng tắm|phong ve sinh|wc|pt)/i.test(normalized)) {
        return false;
      }
      if (hasFurnished && /(noi that|nội thất|furnished)/i.test(normalized)) {
        return false;
      }
      return true;
    });
};

const buildContextualSuggestionCandidates = ({
  focus = {},
  criteria = {},
  properties = [],
  responseMode = 'discovery',
}) => {
  const suggestions = [];
  const pushSuggestion = (value) => {
    const text = String(value || '').trim();
    if (!text) return;
    if (suggestions.includes(text)) return;
    suggestions.push(text);
  };

  if (focus.asksLocationPotential) {
    pushSuggestion('Bạn đang nghiêng về mua ở thực hay đầu tư tăng giá tại khu vực này?');
    if (!hasBudgetCriteria(criteria)) {
      pushSuggestion('Với khu vực này, bạn dự kiến ngân sách tối đa bao nhiêu để mình chốt phân khúc phù hợp?');
    }
    if (properties.length > 0) {
      pushSuggestion('Bạn muốn mình so sánh căn này với 2 bất động sản tương đương cùng khu vực để nhìn rõ biên an toàn giá?');
    }
  }

  if (focus.pointsToSpecificProperty) {
    pushSuggestion('Bạn muốn mình phân tích sâu căn này theo 3 trục: pháp lý, giá khu vực và thanh khoản không?');
  }

  if (focus.asksComparison) {
    pushSuggestion('Bạn muốn mình so sánh theo tiêu chí nào trước: pháp lý, tiềm năng tăng giá hay mức giá trên m2?');
  }

  if (focus.asksFinance) {
    pushSuggestion('Bạn dự kiến dùng vốn tự có khoảng bao nhiêu %, phần còn lại có cần phương án vay ngân hàng không?');
  }

  if (focus.asksLegal) {
    pushSuggestion('Bạn muốn mình đi trước phần giấy tờ sở hữu hay điều khoản đặt cọc để giảm rủi ro?');
  }

  if (responseMode === 'advisory' || responseMode === 'hybrid') {
    pushSuggestion('Bạn muốn mình chốt giúp 2 phương án hành động tiếp theo để ra quyết định nhanh hơn không?');
  }

  return filterQuestionsByKnownCriteria({
    questions: suggestions,
    criteria,
  });
};

const buildAdaptiveCriteriaQuestions = ({
  criteria = {},
  intent = 'property',
  question = '',
  focus = null,
} = {}) => {
  if (!['property', 'mixed'].includes(intent)) return [];
  if (containsAnyKeyword(question, LEGAL_INTENT_KEYWORDS)) return [];
  const questionFocus = focus || detectSuggestionFocus({ question, intent });
  if (questionFocus.pointsToSpecificProperty || questionFocus.asksLegal) return [];

  const normalizedTypes = normalizePropertyType(criteria.propertyTypes || []);
  const hasLocation = Boolean(String(criteria.locationKeyword || '').trim());
  const hasBedrooms = Number.isFinite(Number(criteria.bedrooms));
  const hasBathrooms = Number.isFinite(Number(criteria.bathrooms));
  const hasFurnished = typeof criteria.furnished === 'boolean';
  const hasType = normalizedTypes.length > 0;
  const hasBudget = hasBudgetCriteria(criteria);

  const questions = [];
  const pushQuestion = (value) => {
    const text = String(value || '').trim();
    if (!text) return;
    if (questions.includes(text)) return;
    questions.push(text);
  };

  if (questionFocus.asksLocationPotential) {
    if (!hasBudget) {
      pushQuestion('Với khu vực này, bạn dự kiến ngân sách tối đa bao nhiêu để mình đánh giá sát hơn?');
    }
    if (!hasType) {
      pushQuestion('Trong khu vực này, bạn nhắm phân khúc nào: căn hộ, nhà phố hay biệt thự?');
    }
  } else {
    if (!hasBudget) {
      pushQuestion('Bạn muốn chốt ngân sách tối đa khoảng bao nhiêu tỷ để mình lọc sát hơn?');
    }
    if (!hasLocation) {
      pushQuestion('Bạn ưu tiên khu vực/quận nào để mình khoanh vùng chính xác?');
    }
    if (!hasType) {
      pushQuestion('Bạn muốn loại BĐS nào: căn hộ, nhà phố, biệt thự hay văn phòng?');
    }
  }

  const shouldAskRooms = !hasType || normalizedTypes.some((type) =>
    ['apartment', 'house', 'villa', 'studio', 'office'].includes(type)
  );

  if (shouldAskRooms && !hasBedrooms) {
    pushQuestion('Bạn cần tối thiểu bao nhiêu phòng ngủ?');
  }
  if (shouldAskRooms && !hasBathrooms) {
    pushQuestion('Bạn cần tối thiểu bao nhiêu phòng tắm?');
  }
  if (shouldAskRooms && !hasFurnished) {
    pushQuestion('Bạn có cần căn đã có nội thất sẵn không?');
  }

  return filterQuestionsByKnownCriteria({ questions, criteria }).slice(0, 2);
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

  // Source of truth: route_knowledge + common_workflows.
  // web_navigation_guide is only fallback to avoid duplicate/conflicting navigation context.
  const shouldUseGuideFallback = routeMatches.length === 0 && workflowMatches.length === 0;

  return {
    routes: routeMatches,
    workflows: workflowMatches,
    guideSections: shouldUseGuideFallback ? guideSectionMatches : [],
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
    const escalationTail = ADVISORY_ESCALATION_MESSAGE
      ? ` ${ADVISORY_ESCALATION_MESSAGE}`
      : '';
    return `Để tư vấn sát hơn, mình xin thêm 1-2 thông tin quan trọng: ngân sách tối đa và khu vực ưu tiên của bạn.${escalationTail}`.trim();
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
  question = '',
  criteria = {},
  skillSuggestedQuestions = [],
}) => {
  const suggestions = [];
  const pushSuggestion = (value) => {
    const text = String(value || '').trim();
    if (!text) return;
    if (suggestions.includes(text)) return;
    suggestions.push(text);
  };

  const focus = detectSuggestionFocus({ question, intent });
  const adaptiveQuestions = buildAdaptiveCriteriaQuestions({
    criteria,
    intent,
    question,
    focus,
  });
  const contextualSuggestions = buildContextualSuggestionCandidates({
    focus,
    criteria,
    properties,
    responseMode,
  });
  const filteredSkillQuestions = filterQuestionsByKnownCriteria({
    questions: skillSuggestedQuestions,
    criteria,
  });

  if (responseMode === 'advisory') {
    contextualSuggestions.forEach((item) => pushSuggestion(item));
    adaptiveQuestions.forEach((item) => pushSuggestion(item));
    filteredSkillQuestions.forEach((item) => pushSuggestion(item));
    if (!suggestions.length) {
      if (focus.asksLocationPotential) {
        pushSuggestion('Bạn muốn mình phân tích thêm theo kịch bản 1-3 năm hay 3-5 năm cho khu vực này?');
      } else if (focus.asksLegal) {
        pushSuggestion('Bạn muốn mình gửi checklist giấy tờ cần có trước khi đặt cọc không?');
      } else {
        pushSuggestion('Bạn đang ưu tiên mua để ở thực hay đầu tư tăng giá?');
        if (!hasBudgetCriteria(criteria)) {
          pushSuggestion('Ngân sách tối đa bạn có thể chốt là bao nhiêu tỷ?');
        }
      }
    }
    if (!properties.length && getCriteriaSignalCount(criteria) <= 1) {
      const handoffHint = ADVISORY_ESCALATION_ROUTE
        ? `Nếu muốn, mình có thể chuyển bạn sang tư vấn viên người thật tại ${ADVISORY_ESCALATION_ROUTE}.`
        : 'Nếu muốn, mình có thể chuyển bạn sang tư vấn viên người thật để trao đổi trực tiếp.';
      pushSuggestion(handoffHint);
    }
    return suggestions.slice(0, 2);
  }

  if (intent === 'property' || intent === 'mixed') {
    contextualSuggestions.forEach((item) => pushSuggestion(item));
    adaptiveQuestions.forEach((item) => pushSuggestion(item));
    if (properties.length > 0) {
      if (!focus.pointsToSpecificProperty && !focus.asksComparison) {
        pushSuggestion('Bạn muốn mình so sánh nhanh 2-3 bất động sản tương đương cùng khu vực để chốt phương án tốt nhất không?');
      }
      if (!focus.pointsToSpecificProperty && !focus.asksLocationPotential) {
        pushSuggestion('Nếu cần lọc sâu hơn, bạn cho mình thêm quận/phường ưu tiên và số phòng ngủ mong muốn.');
      }
    } else {
      if (!adaptiveQuestions.length && !contextualSuggestions.length) {
        pushSuggestion('Cho mình ngân sách mua dự kiến (ví dụ: dưới 20 tỷ) để lọc chính xác hơn.');
        pushSuggestion('Bạn muốn ưu tiên khu vực nào tại TP.HCM (quận/phường cụ thể)?');
      }
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

  const shouldTightenSuggestionCount =
    responseMode === 'hybrid' ||
    focus.asksLocationPotential ||
    focus.asksLegal ||
    focus.pointsToSpecificProperty ||
    focus.asksComparison;
  return suggestions.slice(0, shouldTightenSuggestionCount ? 2 : 3);
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

const looksLikeStructuredAnswer = (text = '') => {
  const normalized = String(text || '');
  return (
    /\n\s*\d+\.\s/.test(normalized) ||
    /\n\s*-\s+/.test(normalized) ||
    /https?:\/\/\S+/.test(normalized)
  );
};

const looksIncompleteAnswer = (text = '') => {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  if (looksLikeStructuredAnswer(trimmed)) return false;
  if (trimmed.split(/\s+/).length < 10) return false;
  if (/[.!?…)"'”’]$/.test(trimmed)) return false;
  if (/[,:;]$/.test(trimmed)) return true;
  if (/[A-Za-zÀ-ỹ0-9]$/.test(trimmed)) return true;
  return false;
};

const stitchContinuation = (base = '', continuation = '') => {
  const left = String(base || '').trim();
  const right = toChatPlainText(continuation);
  const normalizedRight = String(right || '').trim();
  if (!normalizedRight) return left;

  const lowerLeft = left.toLowerCase();
  const lowerRight = normalizedRight.toLowerCase();
  const maxOverlap = Math.min(140, lowerLeft.length, lowerRight.length);

  let overlap = 0;
  for (let size = maxOverlap; size >= 12; size -= 1) {
    if (lowerLeft.slice(-size) === lowerRight.slice(0, size)) {
      overlap = size;
      break;
    }
  }

  if (overlap > 0) {
    const remaining = normalizedRight.slice(overlap).trim();
    if (!remaining) return left;
    return `${left} ${remaining}`.replace(/\s{2,}/g, ' ').trim();
  }

  return `${left} ${normalizedRight}`.replace(/\s{2,}/g, ' ').trim();
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

const buildFocusedPropertyAdvice = ({ property, referenceIndex, preferenceProfile = {} }) => {
  if (!property) return '';
  const preferredTypes = normalizePropertyType(preferenceProfile?.propertyTypes || []);
  const typeMismatchNotice =
    preferredTypes.length > 0 && !preferredTypes.includes(property.type)
      ? `Lưu ý nhanh: căn này là loại ${property.type}, trong khi nhu cầu bạn đang ưu tiên là ${preferredTypes.join(', ')}.`
      : '';

  const intro = referenceIndex
    ? `Mình xem nhanh bất động sản số ${referenceIndex} bạn vừa chọn nhé.`
    : 'Mình xem nhanh căn bạn vừa chọn nhé.';

  return [
    intro,
    `Thông tin chính: ${property.title} | Khu vực: ${property.address || 'N/A'} | Giá: ${formatPriceVnd(property.price)} | Loại: ${property.type || 'N/A'} | PN/PT: ${property.bedrooms ?? 'N/A'}/${property.bathrooms ?? 'N/A'} | Chi tiết: ${property.url}`,
    typeMismatchNotice,
    'Đánh giá nhanh: căn này có thể phù hợp nếu mục tiêu của bạn là giữ tài sản an toàn và ưu tiên vị trí. Tuy nhiên vẫn cần đối chiếu thêm mục tiêu ở thực hay đầu tư để chốt đúng phương án.',
    'Trước khi quyết định, bạn nên kiểm tra kỹ pháp lý sổ, quy hoạch khu vực, và so sánh thêm 2 căn tương đương để định giá tốt hơn.',
    'Nếu bạn muốn, mình sẽ tư vấn sâu ngay theo mục tiêu của bạn (ở thực hay đầu tư) để ra quyết định rõ ràng hơn.',
  ]
    .filter(Boolean)
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
  if (!CHATBOT_EXPOSE_SKILL_OVERLAY) {
    return base;
  }

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
      answer: buildFocusedPropertyAdvice({
        ...referencedProperty,
        preferenceProfile: preferenceProfile || {},
      }),
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
  const botIdentityPromptContext = buildBotIdentityContext();
  const responseModeGuidance =
    responseMode === 'advisory'
      ? [
          '- Bạn đang ở chế độ tư vấn. Không tự động liệt kê danh sách dài bất động sản nếu user không yêu cầu rõ.',
          '- Trả lời theo vai trò chuyên viên tư vấn mua bán: phân tích nhu cầu, rủi ro, pháp lý, thanh khoản, và bước ra quyết định.',
          '- Khi thiếu dữ liệu lọc, chỉ hỏi tối đa 1-2 tiêu chí quan trọng nhất mỗi lượt (ví dụ: ngân sách, khu vực, phòng ngủ, nội thất).',
          '- Không hỏi dồn toàn bộ checklist trong một câu trả lời.',
          '- Nếu user đã cung cấp tiêu chí nào thì không hỏi lại tiêu chí đó.',
          '- Chỉ nêu tối đa 1-2 ví dụ bất động sản nếu thực sự cần minh hoạ cho tư vấn.',
          '- Kết thúc bằng 1 câu hỏi làm rõ quan trọng nhất để tiếp tục tư vấn.',
        ].join('\n')
      : responseMode === 'hybrid'
        ? [
            '- Bạn đang ở chế độ kết hợp tư vấn + gợi ý.',
            '- Chỉ hỏi tối đa 1-2 tiêu chí còn thiếu ở mỗi lượt, không hỏi hết một lần.',
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
- Escalation policy: chỉ hỏi làm rõ tối đa ${ADVISORY_MAX_CLARIFYING_QUESTIONS} lượt khi thiếu dữ liệu. Sau ngưỡng này phải chủ động đề xuất handoff theo quy tắc: "${ADVISORY_ESCALATION_MESSAGE}".

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

Bot identity context:
${botIdentityPromptContext}
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
    question: normalizedQuestion,
    criteria: propertyCriteria,
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
  let completedAnswer = finalAnswer;
  if (apiKey && looksIncompleteAnswer(completedAnswer)) {
    try {
      const continuationPrompt = `
Tin nhắn trả lời dưới đây đang bị ngắt giữa chừng.
Hãy viết DUY NHẤT phần nối tiếp để kết thúc tự nhiên.
Quy tắc:
- Không lặp lại nội dung đã có.
- Tối đa 1-2 câu ngắn.
- Kết thúc bằng dấu câu đầy đủ.
- Trả lời cùng ngôn ngữ người dùng.

Câu hỏi user:
${normalizedQuestion}

Đoạn đã có:
${completedAnswer}
`.trim();
      const continuationText = await callGemini({
        apiKey,
        prompt: continuationPrompt,
        temperature: 0.2,
        maxOutputTokens: 180,
      });
      completedAnswer = stitchContinuation(completedAnswer, continuationText);
    } catch (error) {
      completedAnswer = `${String(completedAnswer || '').trim()}.\n\nBạn muốn mình hướng dẫn tiếp từng bước luôn không?`.trim();
    }
  }
  if (looksIncompleteAnswer(completedAnswer)) {
    completedAnswer = `${String(completedAnswer || '').trim()}.\n\nBạn muốn mình đi tiếp phần chi tiết theo từng bước luôn không?`.trim();
  }

  return {
    answer: completedAnswer,
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
