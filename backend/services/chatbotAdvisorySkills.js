const { loadChatbotKnowledge } = require('../config/chatbotKnowledgeLoader');

const formatPriceVnd = (value) => `${Number(value || 0).toLocaleString('vi-VN')} VND`;

const normalizeText = (value) => String(value || '').trim().toLowerCase();
const stripDiacritics = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
const normalizeAscii = (value) => normalizeText(stripDiacritics(value));

const containsAnyKeyword = (text = '', keywords = []) => {
  const haystack = normalizeAscii(text);
  return keywords.some((keyword) => haystack.includes(normalizeAscii(keyword)));
};

const KNOWLEDGE_BASE = loadChatbotKnowledge();
const ADVISORY_PLAYBOOK = KNOWLEDGE_BASE.advisoryPlaybook || {};
const LEGAL_RULES = KNOWLEDGE_BASE.legalChecklist || {};
const HUMAN_CONVERSATION_STYLE = KNOWLEDGE_BASE.humanConversationStyle || {};

const DEFAULT_LEGAL_KEYWORDS = [
  'phap ly',
  'pháp lý',
  'so do',
  'sổ đỏ',
  'so hong',
  'sổ hồng',
  'quy hoach',
  'quy hoạch',
  'tranh chap',
  'tranh chấp',
  'the chap',
  'thế chấp',
  'hop dong',
  'hợp đồng',
  'cong chung',
  'công chứng',
  'sang ten',
  'sang tên',
  'dat coc',
  'đặt cọc',
];

const DEFAULT_INVESTMENT_KEYWORDS = [
  'dau tu',
  'đầu tư',
  'thanh khoan',
  'thanh khoản',
  'dong tien',
  'dòng tiền',
  'biên độ giá',
  'bien do gia',
  'sinh loi',
  'sinh lời',
];

const DEFAULT_SELF_USE_KEYWORDS = [
  'o thuc',
  'ở thực',
  'an cu',
  'an cư',
  'gia dinh',
  'gia đình',
  'truong hoc',
  'trường học',
  'di lai',
  'đi lại',
];

const DEFAULT_RISK_KEYWORDS = ['rui ro', 'rủi ro', 'hop dong', 'hợp đồng'];
const DEFAULT_LEGAL_CHECKLIST = [
  'Kiểm tra quyền sở hữu: sổ đỏ/sổ hồng, thông tin chủ sở hữu, tình trạng đồng sở hữu.',
  'Kiểm tra ràng buộc pháp lý: thế chấp, kê biên, tranh chấp, hạn chế chuyển nhượng.',
  'Kiểm tra quy hoạch: lộ giới, quy hoạch treo, mục đích sử dụng đất và chỉ tiêu xây dựng.',
  'Kiểm tra hồ sơ giao dịch: hợp đồng đặt cọc, điều khoản phạt, mốc thanh toán, điều kiện hoàn cọc.',
  'Kiểm tra nghĩa vụ tài chính: thuế, phí trước bạ, chi phí công chứng và sang tên.',
];
const DEFAULT_LEGAL_DISCLAIMER_SHORT =
  'Lưu ý pháp lý bắt buộc: thông tin Clara cung cấp chỉ để tham khảo, không thay thế ý kiến pháp lý chính thức.';
const DEFAULT_LEGAL_DISCLAIMER_LONG =
  'Khuyến nghị: trước khi đặt cọc hoặc ký hợp đồng chuyển nhượng, bạn cần kiểm tra hồ sơ thực tế với công chứng viên/luật sư và cơ quan nhà nước có thẩm quyền.';
const DEFAULT_HUMAN_TONE_RULES = [
  'Mở đầu ngắn gọn để xác nhận đã hiểu nhu cầu của người dùng.',
  'Dùng giọng tư vấn tự nhiên kiểu "mình - bạn", hạn chế văn phong hành chính.',
  'Trả lời rõ ý, ngắn gọn, tránh lặp lại câu hỏi đã được người dùng trả lời.',
  'Kết thúc bằng 1 câu hỏi tiếp theo có giá trị để hỗ trợ ra quyết định.',
];
const DEFAULT_HUMAN_PHRASES_TO_AVOID = [
  'Kính gửi quý khách',
  'Xin vui lòng cho biết',
  'Theo dữ liệu hiện có của hệ thống',
];
const DEFAULT_HUMAN_CONNECTORS = [
  'Để mình chốt nhanh:',
  'Mình gợi ý ngắn gọn thế này:',
  'Nếu bạn muốn, mình phân tích sâu thêm phần này.',
];

const LEGAL_KEYWORDS = Array.isArray(LEGAL_RULES.legalKeywords) && LEGAL_RULES.legalKeywords.length > 0
  ? LEGAL_RULES.legalKeywords
  : DEFAULT_LEGAL_KEYWORDS;
const INVESTMENT_KEYWORDS = Array.isArray(ADVISORY_PLAYBOOK.investmentKeywords) && ADVISORY_PLAYBOOK.investmentKeywords.length > 0
  ? ADVISORY_PLAYBOOK.investmentKeywords
  : DEFAULT_INVESTMENT_KEYWORDS;
const SELF_USE_KEYWORDS = Array.isArray(ADVISORY_PLAYBOOK.selfUseKeywords) && ADVISORY_PLAYBOOK.selfUseKeywords.length > 0
  ? ADVISORY_PLAYBOOK.selfUseKeywords
  : DEFAULT_SELF_USE_KEYWORDS;
const RISK_KEYWORDS = Array.isArray(LEGAL_RULES.riskKeywords) && LEGAL_RULES.riskKeywords.length > 0
  ? LEGAL_RULES.riskKeywords
  : DEFAULT_RISK_KEYWORDS;
const LEGAL_CHECKLIST_LINES =
  Array.isArray(LEGAL_RULES.checklist) && LEGAL_RULES.checklist.length > 0
    ? LEGAL_RULES.checklist
    : DEFAULT_LEGAL_CHECKLIST;
const LEGAL_DISCLAIMER_SHORT =
  String(LEGAL_RULES.disclaimerShort || '').trim() ||
  String(LEGAL_RULES.disclaimer || '').trim() ||
  DEFAULT_LEGAL_DISCLAIMER_SHORT;
const LEGAL_DISCLAIMER_LONG =
  String(LEGAL_RULES.disclaimerLong || '').trim() || DEFAULT_LEGAL_DISCLAIMER_LONG;
const LEGAL_DISCLAIMER_POLICY =
  String(LEGAL_RULES.mandatoryDisclaimerPolicy || '').trim() ||
  'Bắt buộc gắn disclaimer trong mọi phản hồi có nội dung pháp lý.';
const HUMAN_TONE_RULES =
  Array.isArray(HUMAN_CONVERSATION_STYLE.toneRules) && HUMAN_CONVERSATION_STYLE.toneRules.length > 0
    ? HUMAN_CONVERSATION_STYLE.toneRules
    : DEFAULT_HUMAN_TONE_RULES;
const HUMAN_PHRASES_TO_AVOID =
  Array.isArray(HUMAN_CONVERSATION_STYLE.phrasesToAvoid) &&
  HUMAN_CONVERSATION_STYLE.phrasesToAvoid.length > 0
    ? HUMAN_CONVERSATION_STYLE.phrasesToAvoid
    : DEFAULT_HUMAN_PHRASES_TO_AVOID;
const HUMAN_CONNECTORS =
  Array.isArray(HUMAN_CONVERSATION_STYLE.humanConnectors) &&
  HUMAN_CONVERSATION_STYLE.humanConnectors.length > 0
    ? HUMAN_CONVERSATION_STYLE.humanConnectors
    : DEFAULT_HUMAN_CONNECTORS;

const CONSULTING_QUESTION_TEMPLATES = {
  unknown:
    Array.isArray(ADVISORY_PLAYBOOK?.consultingQuestions?.unknown) &&
    ADVISORY_PLAYBOOK.consultingQuestions.unknown.length > 0
      ? ADVISORY_PLAYBOOK.consultingQuestions.unknown
      : ['Bạn đang ưu tiên mua để ở thực hay đầu tư tăng giá?'],
  investment:
    Array.isArray(ADVISORY_PLAYBOOK?.consultingQuestions?.investment) &&
    ADVISORY_PLAYBOOK.consultingQuestions.investment.length > 0
      ? ADVISORY_PLAYBOOK.consultingQuestions.investment
      : ['Bạn kỳ vọng biên độ tăng giá trong bao lâu (1-3 năm hay 3-5 năm)?'],
  self_use:
    Array.isArray(ADVISORY_PLAYBOOK?.consultingQuestions?.self_use) &&
    ADVISORY_PLAYBOOK.consultingQuestions.self_use.length > 0
      ? ADVISORY_PLAYBOOK.consultingQuestions.self_use
      : ['Bạn ưu tiên yếu tố nào nhất: khoảng cách đi làm, trường học hay tiện ích sống?'],
  legal:
    Array.isArray(ADVISORY_PLAYBOOK?.consultingQuestions?.legal) &&
    ADVISORY_PLAYBOOK.consultingQuestions.legal.length > 0
      ? ADVISORY_PLAYBOOK.consultingQuestions.legal
      : ['Bạn muốn mình ưu tiên checklist pháp lý trước hay so sánh mức giá khu vực trước?'],
};

const derivePurchaseGoal = (question = '') => {
  const normalized = normalizeAscii(question);
  const isInvestment = containsAnyKeyword(normalized, INVESTMENT_KEYWORDS);
  const isSelfUse = containsAnyKeyword(normalized, SELF_USE_KEYWORDS);

  if (isInvestment && isSelfUse) return 'hybrid';
  if (isInvestment) return 'investment';
  if (isSelfUse) return 'self_use';
  return 'unknown';
};

const toList = (value) => (Array.isArray(value) ? value : []);

const summarizeProfile = ({ criteria = {}, preferenceProfile = {} }) => {
  const lines = [];

  const budgetMin = Number.isFinite(Number(criteria.minPrice))
    ? Number(criteria.minPrice)
    : Number.isFinite(Number(preferenceProfile.budgetMin))
      ? Number(preferenceProfile.budgetMin)
      : null;
  const budgetMax = Number.isFinite(Number(criteria.maxPrice))
    ? Number(criteria.maxPrice)
    : Number.isFinite(Number(preferenceProfile.budgetMax))
      ? Number(preferenceProfile.budgetMax)
      : null;

  if (Number.isFinite(budgetMin) || Number.isFinite(budgetMax)) {
    lines.push(
      `Ngân sách: ${
        Number.isFinite(budgetMin) ? formatPriceVnd(budgetMin) : 'không giới hạn tối thiểu'
      } - ${Number.isFinite(budgetMax) ? formatPriceVnd(budgetMax) : 'không giới hạn tối đa'}`
    );
  }

  const location = String(criteria.locationKeyword || preferenceProfile.locationKeyword || '').trim();
  if (location) lines.push(`Khu vực ưu tiên: ${location}`);

  const bedrooms = Number.isFinite(Number(criteria.bedrooms))
    ? Number(criteria.bedrooms)
    : Number.isFinite(Number(preferenceProfile.bedrooms))
      ? Number(preferenceProfile.bedrooms)
      : null;
  if (Number.isFinite(bedrooms)) lines.push(`Số phòng ngủ mong muốn: ${bedrooms}`);

  const propertyTypes = toList(criteria.propertyTypes).length
    ? toList(criteria.propertyTypes)
    : toList(preferenceProfile.propertyTypes);
  if (propertyTypes.length > 0) lines.push(`Loại BĐS ưu tiên: ${propertyTypes.join(', ')}`);

  const amenities = toList(criteria.amenities).length
    ? toList(criteria.amenities)
    : toList(preferenceProfile.amenities);
  if (amenities.length > 0) lines.push(`Tiện ích ưu tiên: ${amenities.join(', ')}`);

  if (typeof criteria.furnished === 'boolean') {
    lines.push(`Nội thất: ${criteria.furnished ? 'có nội thất' : 'không nội thất'}`);
  } else if (typeof preferenceProfile.furnished === 'boolean') {
    lines.push(`Nội thất: ${preferenceProfile.furnished ? 'có nội thất' : 'không nội thất'}`);
  }

  return lines;
};

const evaluatePropertyFit = ({ property = {}, criteria = {} }) => {
  let score = 50;
  const reasons = [];

  const price = Number(property.price || 0);
  const minPrice = Number(criteria.minPrice);
  const maxPrice = Number(criteria.maxPrice);
  const hasMin = Number.isFinite(minPrice);
  const hasMax = Number.isFinite(maxPrice);

  if (hasMin && price >= minPrice) {
    score += 10;
    reasons.push('đạt ngưỡng giá tối thiểu');
  } else if (hasMin && price < minPrice) {
    score -= 12;
    reasons.push('thấp hơn ngưỡng giá mong muốn');
  }

  if (hasMax && price <= maxPrice) {
    score += 20;
    reasons.push('nằm trong trần ngân sách');
  } else if (hasMax && price > maxPrice) {
    score -= 18;
    reasons.push('vượt trần ngân sách');
  }

  if (Number.isFinite(Number(criteria.bedrooms))) {
    const expected = Number(criteria.bedrooms);
    const actual = Number(property.bedrooms || 0);
    if (actual >= expected) {
      score += 10;
      reasons.push('đủ số phòng ngủ');
    } else {
      score -= 10;
      reasons.push('thiếu số phòng ngủ');
    }
  }

  if (String(criteria.locationKeyword || '').trim()) {
    const address = normalizeAscii(property.address || '');
    const location = normalizeAscii(criteria.locationKeyword);
    if (address.includes(location)) {
      score += 10;
      reasons.push('khớp khu vực ưu tiên');
    } else {
      reasons.push('chưa khớp hoàn toàn khu vực ưu tiên');
    }
  }

  if (toList(criteria.propertyTypes).length > 0) {
    if (toList(criteria.propertyTypes).includes(property.type)) {
      score += 8;
      reasons.push('đúng loại BĐS mong muốn');
    } else {
      score -= 6;
      reasons.push('khác loại BĐS ưu tiên');
    }
  }

  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return { score: clamped, reasons };
};

const buildPropertyAdvisoryLines = ({ properties = [], criteria = {}, limit = 2 }) => {
  if (!Array.isArray(properties) || properties.length === 0) return [];

  return properties.slice(0, limit).map((property, index) => {
    const { score, reasons } = evaluatePropertyFit({ property, criteria });
    const reasonText = reasons.slice(0, 3).join(', ') || 'cần thêm dữ liệu để đánh giá chính xác';
    return `${index + 1}. ${property.title} | Giá: ${formatPriceVnd(property.price)} | Mức phù hợp: ${score}/100 | Nhận định: ${reasonText} | Chi tiết: ${property.url}`;
  });
};

const buildLegalChecklistLines = ({ focusProperty = null }) => {
  const focusLine = focusProperty?.title
    ? `Trọng tâm kiểm tra pháp lý cho căn: ${focusProperty.title}`
    : 'Checklist pháp lý áp dụng cho căn bạn đang cân nhắc';

  return [
    focusLine,
    `- ${LEGAL_DISCLAIMER_SHORT}`,
    ...LEGAL_CHECKLIST_LINES.map((line) => `- ${line}`),
    LEGAL_DISCLAIMER_LONG,
  ];
};

const buildConsultingQuestions = ({
  goal = 'unknown',
  hasProperties = false,
  isLegalRequested = false,
  criteria = {},
  preferenceProfile = {},
}) => {
  const questions = [];
  const pushQuestion = (value) => {
    const text = String(value || '').trim();
    if (!text) return;
    if (questions.includes(text)) return;
    questions.push(text);
  };

  const normalizeNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const mergedBudgetMin = normalizeNumber(criteria?.minPrice) ?? normalizeNumber(preferenceProfile?.budgetMin);
  const mergedBudgetMax = normalizeNumber(criteria?.maxPrice) ?? normalizeNumber(preferenceProfile?.budgetMax);
  const hasBudget = Number.isFinite(mergedBudgetMin) || Number.isFinite(mergedBudgetMax);
  const hasLocation = Boolean(String(criteria?.locationKeyword || preferenceProfile?.locationKeyword || '').trim());
  const hasBedrooms =
    Number.isFinite(normalizeNumber(criteria?.bedrooms)) || Number.isFinite(normalizeNumber(preferenceProfile?.bedrooms));

  if (goal === 'investment') {
    CONSULTING_QUESTION_TEMPLATES.investment.forEach((item) => pushQuestion(item));
  } else if (goal === 'self_use') {
    CONSULTING_QUESTION_TEMPLATES.self_use.forEach((item) => pushQuestion(item));
  } else {
    CONSULTING_QUESTION_TEMPLATES.unknown.forEach((item) => pushQuestion(item));
  }

  if (!hasBudget) {
    pushQuestion('Ngân sách tối đa bạn có thể chốt (bao gồm dự phòng thuế/phí) là bao nhiêu?');
  }
  if (!isLegalRequested && !hasLocation) {
    pushQuestion('Bạn muốn ưu tiên khu vực nào để mình khoanh vùng phương án phù hợp hơn?');
  }
  if (!isLegalRequested && !hasBedrooms) {
    pushQuestion('Bạn cần tối thiểu bao nhiêu phòng ngủ để mình lọc đúng nhu cầu ở thực?');
  }

  if (isLegalRequested) {
    CONSULTING_QUESTION_TEMPLATES.legal.forEach((item) => pushQuestion(item));
  } else if (hasProperties) {
    pushQuestion('Bạn muốn mình phân tích sâu căn số mấy để đi vào pháp lý và rủi ro giao dịch?');
  }

  return questions.slice(0, 3);
};

const buildSkillContext = ({
  question = '',
  responseMode = 'discovery',
  criteria = {},
  preferenceProfile = {},
  properties = [],
}) => {
  const legalRequested = containsAnyKeyword(question, LEGAL_KEYWORDS);
  const consultingRequested = responseMode === 'advisory' || responseMode === 'hybrid';
  const goal = derivePurchaseGoal(question);
  const profileLines = summarizeProfile({ criteria, preferenceProfile });
  const hasProperties = Array.isArray(properties) && properties.length > 0;
  const propertyAdviceLines = buildPropertyAdvisoryLines({ properties, criteria, limit: 2 });

  const advisoryOverlay = [];
  const promptContext = [];
  const appliedSkills = [];

  appliedSkills.push('humanized_conversation');
  promptContext.push('Skill giao tiếp tự nhiên đang bật (humanized_conversation):');
  HUMAN_TONE_RULES.slice(0, 6).forEach((rule) => {
    promptContext.push(`- ${rule}`);
  });
  if (HUMAN_PHRASES_TO_AVOID.length > 0) {
    promptContext.push(`- Cụm từ nên tránh: ${HUMAN_PHRASES_TO_AVOID.slice(0, 4).join(' | ')}`);
  }
  if (HUMAN_CONNECTORS.length > 0) {
    promptContext.push(`- Cụm chuyển ý gợi ý: ${HUMAN_CONNECTORS.slice(0, 3).join(' | ')}`);
  }

  if (consultingRequested) {
    appliedSkills.push('advisory_consulting');
    advisoryOverlay.push('Khung tư vấn mua BĐS:');
    advisoryOverlay.push(
      goal === 'investment'
        ? '- Mục tiêu suy luận: mua để đầu tư tăng giá.'
        : goal === 'self_use'
          ? '- Mục tiêu suy luận: mua để ở thực/an cư.'
          : '- Mục tiêu suy luận: chưa rõ, cần làm rõ để tư vấn chính xác.'
    );

    if (profileLines.length > 0) {
      advisoryOverlay.push('- Hồ sơ nhu cầu đang hiểu:');
      profileLines.forEach((line) => advisoryOverlay.push(`  ${line}`));
    } else {
      advisoryOverlay.push('- Hồ sơ nhu cầu hiện còn thiếu dữ liệu quan trọng.');
    }

    if (propertyAdviceLines.length > 0) {
      advisoryOverlay.push('- Phân tích sơ bộ các phương án đang có:');
      propertyAdviceLines.forEach((line) => advisoryOverlay.push(`  ${line}`));
    } else {
      advisoryOverlay.push('- Chưa có căn phù hợp rõ ràng để chốt, cần làm rõ thêm nhu cầu lọc.');
    }

    promptContext.push('Skill tư vấn mua BĐS đang bật: phân tích nhu cầu, độ phù hợp, rủi ro và bước quyết định.');
  }

  let legalChecklist = '';
  if (legalRequested || (consultingRequested && containsAnyKeyword(question, RISK_KEYWORDS))) {
    appliedSkills.push('legal_checklist');
    const legalLines = buildLegalChecklistLines({
      focusProperty: hasProperties ? properties[0] : null,
    });
    legalChecklist = legalLines.join('\n');
    advisoryOverlay.push('');
    advisoryOverlay.push('Checklist pháp lý nên kiểm tra trước khi xuống tiền:');
    legalLines.slice(1, 7).forEach((line) => advisoryOverlay.push(line));
    advisoryOverlay.push(`- ${LEGAL_DISCLAIMER_LONG}`);
    promptContext.push('Skill pháp lý giao dịch đang bật: nhấn mạnh kiểm tra sở hữu, quy hoạch, ràng buộc và điều khoản đặt cọc.');
    promptContext.push(`- Chính sách disclaimer pháp lý: ${LEGAL_DISCLAIMER_POLICY}`);
    promptContext.push(`- Disclaimer ngắn (bắt buộc xuất hiện khi trả lời pháp lý): ${LEGAL_DISCLAIMER_SHORT}`);
    promptContext.push(`- Disclaimer mở rộng (ưu tiên thêm ở đoạn kết): ${LEGAL_DISCLAIMER_LONG}`);
  }

  const suggestedQuestions = buildConsultingQuestions({
    goal,
    hasProperties,
    isLegalRequested: legalRequested,
    criteria,
    preferenceProfile,
  });

  return {
    appliedSkills,
    promptContext: promptContext.join('\n').trim(),
    advisoryOverlay: advisoryOverlay.join('\n').trim(),
    legalChecklist,
    suggestedQuestions,
    legalRequested,
    consultingRequested,
  };
};

module.exports = {
  buildSkillContext,
};
