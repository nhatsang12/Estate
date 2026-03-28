const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const EXTERNAL_KNOWLEDGE_DIR =
  process.env.CHATBOT_KB_DIR || 'C:\\Users\\tkien\\Downloads\\crewAI_prj\\project_test\\knowledge';

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

const readMarkdownFile = (fileName) => {
  const candidatePaths = [
    path.join(ROOT_DIR, fileName),
    path.join(EXTERNAL_KNOWLEDGE_DIR, fileName),
  ];

  for (const filePath of candidatePaths) {
    try {
      if (!fs.existsSync(filePath)) continue;
      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      // Try next source path
    }
  }

  return '';
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

  knowledgeCache = {
    propertyTypeMap: parsePropertyTypeMappings(propertyTypeMarkdown),
    amenityAliasMap: parseAmenityAliases(amenityMarkdown),
    navigationGuideSections: parseWebNavigationGuide(navigationMarkdown),
  };

  return knowledgeCache;
};

module.exports = {
  loadChatbotKnowledge,
  parsePropertyTypeMappings,
  parseAmenityAliases,
  parseWebNavigationGuide,
};
