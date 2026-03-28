const axios = require('axios');
const Property = require('../models/Property');

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_EMBED_MODELS = String(
  process.env.GEMINI_EMBED_MODELS ||
    process.env.GEMINI_EMBED_MODEL ||
    'gemini-embedding-001,text-embedding-004'
)
  .split(',')
  .map((model) => model.trim())
  .filter(Boolean);

const EMBEDDING_FIELDS = '_id title description address type bedrooms bathrooms area amenities';

const resolveApiKey = () =>
  String(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();

const getApiErrorMessage = (error) =>
  error?.response?.data?.error?.message || error?.message || 'Unknown error';

const isApiKeyError = (message) =>
  /api key/i.test(String(message || '')) &&
  /(not found|not valid|invalid|permission|unauth|expired)/i.test(String(message || ''));

const buildEmbeddingText = (property) => {
  const amenities = Array.isArray(property?.amenities) ? property.amenities.join(', ') : '';
  return [
    `Title: ${property?.title || ''}`,
    `Description: ${property?.description || ''}`,
    `Address: ${property?.address || ''}`,
    `Type: ${property?.type || ''}`,
    `Bedrooms: ${property?.bedrooms || ''}`,
    `Bathrooms: ${property?.bathrooms || ''}`,
    `Area: ${property?.area || ''}`,
    `Amenities: ${amenities}`,
  ]
    .filter(Boolean)
    .join('\n');
};

const embedText = async (apiKey, text, taskType = 'RETRIEVAL_DOCUMENT') => {
  let lastError = null;

  for (const model of GEMINI_EMBED_MODELS) {
    const endpoint = `${GEMINI_BASE_URL}/${model}:embedContent?key=${apiKey}`;
    const payload = {
      content: {
        parts: [{ text }],
      },
      taskType,
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
        const keyError = new Error(
          'Gemini API key is invalid or unavailable. Please create a valid key in Google AI Studio and set GEMINI_API_KEY.'
        );
        keyError.code = 'INVALID_GEMINI_API_KEY';
        throw keyError;
      }
      lastError = error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error('No embedding model returned vectors.');
};

const resolveProperty = async (propertyOrId) => {
  if (!propertyOrId) return null;
  if (typeof propertyOrId === 'string' || typeof propertyOrId === 'number') {
    return Property.findById(propertyOrId).select(EMBEDDING_FIELDS).lean();
  }
  if (propertyOrId?._id) {
    return propertyOrId;
  }
  return null;
};

const refreshPropertyEmbedding = async (propertyOrId, options = {}) => {
  const { throwOnInvalidKey = false } = options;
  const property = await resolveProperty(propertyOrId);
  if (!property?._id) {
    return { updated: false, reason: 'not_found' };
  }

  const apiKey = resolveApiKey();
  if (!apiKey) {
    return { updated: false, reason: 'missing_api_key' };
  }

  const text = buildEmbeddingText(property);
  if (!text.trim()) {
    return { updated: false, reason: 'empty_text' };
  }

  try {
    const embedding = await embedText(apiKey, text, 'RETRIEVAL_DOCUMENT');
    if (!Array.isArray(embedding) || embedding.length === 0) {
      return { updated: false, reason: 'empty_embedding' };
    }
    await Property.updateOne({ _id: property._id }, { $set: { embedding } });
    return { updated: true, reason: 'ok' };
  } catch (error) {
    if (error?.code === 'INVALID_GEMINI_API_KEY' && throwOnInvalidKey) {
      throw error;
    }
    return {
      updated: false,
      reason: error?.code || 'embedding_error',
      errorMessage: getApiErrorMessage(error),
    };
  }
};

const queuePropertyEmbeddingRefresh = (propertyId) => {
  if (!propertyId) return;
  setImmediate(async () => {
    try {
      const result = await refreshPropertyEmbedding(String(propertyId), {
        throwOnInvalidKey: false,
      });
      if (!result.updated && result.reason !== 'missing_api_key') {
        console.warn(
          `Property embedding refresh skipped for ${propertyId}: ${result.reason}${result.errorMessage ? ` - ${result.errorMessage}` : ''}`
        );
      }
    } catch (error) {
      console.warn(
        `Property embedding refresh failed for ${propertyId}: ${getApiErrorMessage(error)}`
      );
    }
  });
};

module.exports = {
  EMBEDDING_FIELDS,
  buildEmbeddingText,
  embedText,
  getApiErrorMessage,
  resolveApiKey,
  refreshPropertyEmbedding,
  queuePropertyEmbeddingRefresh,
};
