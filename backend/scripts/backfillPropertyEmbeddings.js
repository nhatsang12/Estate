const dotenv = require('dotenv');
const mongoose = require('mongoose');
const axios = require('axios');
const connectDB = require('../config/db');
const Property = require('../models/Property');

dotenv.config({ override: process.env.NODE_ENV !== 'production' });

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_EMBED_MODELS = String(
  process.env.GEMINI_EMBED_MODELS ||
    process.env.GEMINI_EMBED_MODEL ||
    'gemini-embedding-001,text-embedding-004'
)
  .split(',')
  .map((model) => model.trim())
  .filter(Boolean);

const resolveApiKey = () =>
  String(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();

const getApiErrorMessage = (error) =>
  error?.response?.data?.error?.message || error?.message || 'Unknown error';

const isApiKeyError = (message) =>
  /api key/i.test(String(message || '')) &&
  /(not found|not valid|invalid|permission|unauth)/i.test(String(message || ''));

const buildEmbeddingText = (property) => {
  const amenities = Array.isArray(property.amenities) ? property.amenities.join(', ') : '';
  return [
    `Title: ${property.title || ''}`,
    `Description: ${property.description || ''}`,
    `Address: ${property.address || ''}`,
    `Type: ${property.type || ''}`,
    `Bedrooms: ${property.bedrooms || ''}`,
    `Bathrooms: ${property.bathrooms || ''}`,
    `Area: ${property.area || ''}`,
    `Amenities: ${amenities}`,
  ]
    .filter(Boolean)
    .join('\n');
};

const embedText = async (apiKey, text) => {
  let lastError = null;

  for (const model of GEMINI_EMBED_MODELS) {
    const endpoint = `${GEMINI_BASE_URL}/${model}:embedContent?key=${apiKey}`;
    const payload = {
      content: {
        parts: [{ text }],
      },
      taskType: 'RETRIEVAL_DOCUMENT',
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

const run = async () => {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY (or GOOGLE_API_KEY) is missing in .env');
  }

  await connectDB();

  const properties = await Property.find({
    status: 'approved',
    $or: [{ embedding: { $exists: false } }, { embedding: { $size: 0 } }],
  }).select('_id title description address type bedrooms bathrooms area amenities');

  console.log(`Found ${properties.length} properties without embedding`);

  let updated = 0;
  for (const property of properties) {
    const text = buildEmbeddingText(property);
    if (!text.trim()) continue;

    try {
      const embedding = await embedText(apiKey, text);
      if (!Array.isArray(embedding) || embedding.length === 0) {
        continue;
      }
      await Property.updateOne({ _id: property._id }, { $set: { embedding } });
      updated += 1;
      console.log(`Updated embedding for property ${property._id}`);
    } catch (error) {
      console.error(`Embedding failed for property ${property._id}:`, getApiErrorMessage(error));
      if (error?.code === 'INVALID_GEMINI_API_KEY') {
        throw error;
      }
    }
  }

  console.log(`Backfill completed. Updated ${updated}/${properties.length} properties.`);
  await mongoose.connection.close();
};

run().catch(async (error) => {
  console.error('Backfill job failed:', error.message);
  try {
    await mongoose.connection.close();
  } catch (closeError) {
    // no-op
  }
  process.exit(1);
});
