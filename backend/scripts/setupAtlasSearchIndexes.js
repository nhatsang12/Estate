const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Property = require('../models/Property');

dotenv.config({ override: process.env.NODE_ENV !== 'production' });

const SEARCH_INDEX_NAME = process.env.MONGO_SEARCH_INDEX || 'property_search';
const VECTOR_INDEX_NAME = process.env.MONGO_VECTOR_INDEX || 'properties_vector_index';
const VECTOR_PATH = process.env.MONGO_VECTOR_PATH || 'embedding';
const VECTOR_DIMENSIONS = Number(process.env.MONGO_VECTOR_DIMENSIONS || 768);

const ensureSearchIndex = async (collection, existingNames) => {
  if (existingNames.has(SEARCH_INDEX_NAME)) {
    console.log(`Search index "${SEARCH_INDEX_NAME}" already exists`);
    return;
  }

  const model = {
    name: SEARCH_INDEX_NAME,
    definition: {
      mappings: {
        dynamic: false,
        fields: {
          title: { type: 'string' },
          description: { type: 'string' },
          address: { type: 'string' },
          amenities: { type: 'string' },
          type: { type: 'string' },
        },
      },
    },
  };

  await collection.createSearchIndex(model);
  console.log(`Created search index "${SEARCH_INDEX_NAME}"`);
};

const ensureVectorIndex = async (collection, existingNames) => {
  if (existingNames.has(VECTOR_INDEX_NAME)) {
    console.log(`Vector index "${VECTOR_INDEX_NAME}" already exists`);
    return;
  }

  const model = {
    name: VECTOR_INDEX_NAME,
    type: 'vectorSearch',
    definition: {
      fields: [
        {
          type: 'vector',
          path: VECTOR_PATH,
          numDimensions: VECTOR_DIMENSIONS,
          similarity: 'cosine',
        },
      ],
    },
  };

  await collection.createSearchIndex(model);
  console.log(`Created vector index "${VECTOR_INDEX_NAME}"`);
};

const run = async () => {
  await connectDB();
  const collection = Property.collection;

  if (typeof collection.createSearchIndex !== 'function') {
    throw new Error('MongoDB driver does not support createSearchIndex on this environment');
  }

  if (typeof collection.listSearchIndexes !== 'function') {
    throw new Error('MongoDB driver does not support listSearchIndexes on this environment');
  }

  const existingIndexes = await collection.listSearchIndexes().toArray();
  const existingNames = new Set(existingIndexes.map((item) => item.name));

  await ensureSearchIndex(collection, existingNames);
  await ensureVectorIndex(collection, existingNames);

  console.log('Atlas Search/Vector index setup completed.');
  await mongoose.connection.close();
};

run().catch(async (error) => {
  console.error('Setup index script failed:', error.message);
  try {
    await mongoose.connection.close();
  } catch (closeError) {
    // no-op
  }
  process.exit(1);
});
