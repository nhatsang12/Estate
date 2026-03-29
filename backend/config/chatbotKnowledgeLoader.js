const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const LOCAL_CHATBOT_KNOWLEDGE_DIR = path.join(ROOT_DIR, 'knowledge', 'chatbot');
const EXTERNAL_KNOWLEDGE_DIR = process.env.CHATBOT_KB_DIR || '';

const DEFAULT_PROPERTY_TYPE_MAP = {
  apartment: 'apartment',
  'căn hộ': 'apartment',
  condo: 'apartment',
  house: 'house',
  'nhà phố': 'house',
  villa: 'villa',
  'biệt thự': 'villa',
  studio: 'studio',
  office: 'office',
  'văn phòng': 'office',
};

const DEFAULT_AMENITY_ALIAS_MAP = {
  'hồ bơi': 'Hồ bơi',
  pool: 'Hồ bơi',
  gym: 'Phòng gym',
  'phòng gym': 'Phòng gym',
  wifi: 'WiFi',
  internet: 'WiFi',
  'điều hoà': 'Điều hoà',
  'máy lạnh': 'Điều hoà',
  'air conditioner': 'Điều hoà',
  parking: 'Bãi đỗ xe',
  'bãi đỗ xe': 'Bãi đỗ xe',
  'chỗ đậu xe': 'Bãi đỗ xe',
  balcony: 'Ban công',
  'ban công': 'Ban công',
  'bảo vệ': 'Bảo vệ 24/7',
  'an ninh': 'Bảo vệ 24/7',
  security: 'Bảo vệ 24/7',
};

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'that',
  'this',
  'your',
  'các',
  'những',
  'được',
  'trong',
  'trên',
  'của',
  'cho',
  'khi',
  'vào',
  'đến',
  'này',
  'đó',
  'một',
  'hai',
  'ba',
  'bốn',
  'năm',
]);

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const readFileIfExists = (filePath) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) return '';
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return '';
  }
};

const readMarkdownFile = (fileName) => {
  const candidatePaths = [];
  if (EXTERNAL_KNOWLEDGE_DIR) {
    candidatePaths.push(path.join(EXTERNAL_KNOWLEDGE_DIR, fileName));
  }
  candidatePaths.push(path.join(LOCAL_CHATBOT_KNOWLEDGE_DIR, fileName));
  candidatePaths.push(path.join(ROOT_DIR, fileName));

  for (const filePath of candidatePaths) {
    const content = readFileIfExists(filePath);
    if (content) return content;
  }

  return '';
};

const extractJsonFromMarkdown = (markdown) => {
  const content = String(markdown || '').trim();
  if (!content) return null;

  const fencedMatch = content.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? String(fencedMatch[1] || '').trim() : content;

  try {
    return JSON.parse(candidate);
  } catch (error) {
    const startArray = candidate.indexOf('[');
    const endArray = candidate.lastIndexOf(']');
    if (startArray !== -1 && endArray !== -1 && endArray > startArray) {
      try {
        return JSON.parse(candidate.slice(startArray, endArray + 1));
      } catch (innerError) {
        // continue
      }
    }

    const startObject = candidate.indexOf('{');
    const endObject = candidate.lastIndexOf('}');
    if (startObject !== -1 && endObject !== -1 && endObject > startObject) {
      try {
        return JSON.parse(candidate.slice(startObject, endObject + 1));
      } catch (innerError) {
        return null;
      }
    }

    return null;
  }
};

const ensureStringArray = (value) =>
  Array.isArray(value)
    ? value
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    : [];

const parseRouteKnowledge = (markdown) => {
  const parsed = extractJsonFromMarkdown(markdown);
  const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.routes) ? parsed.routes : [];
  const normalized = rows
    .map((row) => ({
      route: String(row?.route || '').trim(),
      title: String(row?.title || '').trim(),
      summary: String(row?.summary || '').trim(),
      keywords: ensureStringArray(row?.keywords),
      steps: ensureStringArray(row?.steps),
    }))
    .filter((row) => row.route && row.title);

  return normalized;
};

const parseCommonWorkflows = (markdown) => {
  const parsed = extractJsonFromMarkdown(markdown);
  const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.workflows) ? parsed.workflows : [];
  const normalized = rows
    .map((row) => ({
      title: String(row?.title || '').trim(),
      keywords: ensureStringArray(row?.keywords),
      guidance: ensureStringArray(row?.guidance),
      routes: ensureStringArray(row?.routes),
    }))
    .filter((row) => row.title);

  return normalized;
};

const parseAdvisoryPlaybook = (markdown) => {
  const parsed = extractJsonFromMarkdown(markdown);
  const advisoryKeywords = ensureStringArray(parsed?.advisoryKeywords);
  const listingRequestKeywords = ensureStringArray(parsed?.listingRequestKeywords);
  const investmentKeywords = ensureStringArray(parsed?.investmentKeywords);
  const selfUseKeywords = ensureStringArray(parsed?.selfUseKeywords);

  const consultingQuestionsRaw = parsed?.consultingQuestions || {};
  const consultingQuestions = {
    unknown: ensureStringArray(consultingQuestionsRaw.unknown),
    investment: ensureStringArray(consultingQuestionsRaw.investment),
    self_use: ensureStringArray(consultingQuestionsRaw.self_use),
    legal: ensureStringArray(consultingQuestionsRaw.legal),
  };

  return {
    advisoryKeywords,
    listingRequestKeywords,
    investmentKeywords,
    selfUseKeywords,
    consultingQuestions,
  };
};

const parseLegalChecklist = (markdown) => {
  const parsed = extractJsonFromMarkdown(markdown);
  return {
    legalKeywords: ensureStringArray(parsed?.legalKeywords),
    riskKeywords: ensureStringArray(parsed?.riskKeywords),
    checklist: ensureStringArray(parsed?.checklist),
    disclaimer: String(parsed?.disclaimer || '').trim(),
  };
};

const normalizeStandardType = (value) => {
  const normalized = normalizeText(value).replace(/\(.*?\)/g, '').trim();
  if (!normalized) return '';

  if (normalized.includes('apartment') || normalized.includes('căn hộ') || normalized.includes('condo')) {
    return 'apartment';
  }
  if (normalized.includes('house') || normalized.includes('nhà phố')) {
    return 'house';
  }
  if (normalized.includes('villa') || normalized.includes('biệt thự')) {
    return 'villa';
  }
  if (normalized.includes('studio')) {
    return 'studio';
  }
  if (normalized.includes('office') || normalized.includes('văn phòng')) {
    return 'office';
  }

  return normalized;
};

const parsePropertyTypeMappings = (markdown) => {
  const aliasMap = { ...DEFAULT_PROPERTY_TYPE_MAP };
  const lines = String(markdown || '').split(/\r?\n/);

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) return;
    if (/^(\|\s*-+\s*)+\|?$/.test(trimmed)) return;

    const cells = trimmed
      .split('|')
      .map((cell) => cell.trim())
      .filter(Boolean);

    if (cells.length < 2) return;
    if (normalizeText(cells[0]) === 'alias (vietnamese/english)') return;

    const alias = normalizeText(cells[0]);
    const standard = normalizeStandardType(cells[1]);
    if (!alias || !standard) return;

    aliasMap[alias] = standard;
    aliasMap[standard] = standard;
  });

  return aliasMap;
};

const parseAmenityAliases = (markdown) => {
  const aliasMap = { ...DEFAULT_AMENITY_ALIAS_MAP };
  const lines = String(markdown || '').split(/\r?\n/);
  let currentAmenity = '';

  lines.forEach((line) => {
    const headingMatch = line.match(/^\s*-\s*\*\*(.+?)\*\*:?/);
    if (headingMatch) {
      const canonical = String(headingMatch[1] || '')
        .replace(/\(.*?\)/g, '')
        .replace(/\s*:\s*$/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
      currentAmenity = canonical;
      if (canonical) {
        aliasMap[normalizeText(canonical)] = canonical;
      }
      return;
    }

    if (!currentAmenity) return;
    const aliasMatch = line.match(/^\s*-\s+(.+?)\s*$/);
    if (!aliasMatch) return;

    const aliasRaw = String(aliasMatch[1] || '').trim();
    if (!aliasRaw || aliasRaw.startsWith('**')) return;
    aliasMap[normalizeText(aliasRaw)] = currentAmenity;
  });

  return aliasMap;
};

const extractKeywords = (text) => {
  const normalized = normalizeText(text).replace(/[^\p{L}\p{N}\s/]/gu, ' ');
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const keywords = [];

  for (const token of tokens) {
    if (token.length < 3) continue;
    if (STOP_WORDS.has(token)) continue;
    if (keywords.includes(token)) continue;
    keywords.push(token);
    if (keywords.length >= 50) break;
  }

  return keywords;
};

const parseWebNavigationGuide = (markdown) => {
  const lines = String(markdown || '').split(/\r?\n/);
  const sections = [];
  let current = null;
  let currentParentTitle = '';

  const pushCurrent = () => {
    if (!current) return;
    const content = current.contentLines.join('\n').trim();
    if (!content) {
      current = null;
      return;
    }
    sections.push({
      title: current.title,
      content,
      excerpt: content.slice(0, 500),
      keywords: extractKeywords(`${current.title}\n${content}`),
    });
    current = null;
  };

  lines.forEach((line) => {
    const level2 = line.match(/^##\s+(.+?)\s*$/);
    if (level2) {
      pushCurrent();
      currentParentTitle = level2[1].trim();
      current = { title: currentParentTitle, contentLines: [] };
      return;
    }

    const level3 = line.match(/^###\s+(.+?)\s*$/);
    if (level3) {
      pushCurrent();
      const childTitle = level3[1].trim();
      const title = currentParentTitle
        ? `${currentParentTitle} - ${childTitle}`
        : childTitle;
      current = { title, contentLines: [] };
      return;
    }

    if (!current) return;
    current.contentLines.push(line.trimEnd());
  });

  pushCurrent();
  return sections;
};

let knowledgeCache = null;

const loadChatbotKnowledge = () => {
  if (knowledgeCache) return knowledgeCache;

  const propertyTypeMarkdown = readMarkdownFile('property_type_mappings.md');
  const amenityMarkdown = readMarkdownFile('amenity_aliases.md');
  const navigationMarkdown = readMarkdownFile('web_navigation_guide.md');
  const routeKnowledgeMarkdown = readMarkdownFile('route_knowledge.md');
  const workflowMarkdown = readMarkdownFile('common_workflows.md');
  const advisoryPlaybookMarkdown = readMarkdownFile('advisory_playbook.md');
  const legalChecklistMarkdown = readMarkdownFile('legal_checklist.md');

  knowledgeCache = {
    propertyTypeMap: parsePropertyTypeMappings(propertyTypeMarkdown),
    amenityAliasMap: parseAmenityAliases(amenityMarkdown),
    navigationGuideSections: parseWebNavigationGuide(navigationMarkdown),
    routeKnowledge: parseRouteKnowledge(routeKnowledgeMarkdown),
    commonWorkflows: parseCommonWorkflows(workflowMarkdown),
    advisoryPlaybook: parseAdvisoryPlaybook(advisoryPlaybookMarkdown),
    legalChecklist: parseLegalChecklist(legalChecklistMarkdown),
    knowledgeDir: EXTERNAL_KNOWLEDGE_DIR || LOCAL_CHATBOT_KNOWLEDGE_DIR,
  };

  return knowledgeCache;
};

module.exports = {
  loadChatbotKnowledge,
  parsePropertyTypeMappings,
  parseAmenityAliases,
  parseWebNavigationGuide,
  parseRouteKnowledge,
  parseCommonWorkflows,
  parseAdvisoryPlaybook,
  parseLegalChecklist,
};
