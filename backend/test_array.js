const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Property = require('./models/Property');
const APIFeatures = require('./utils/apiFeatures');

dotenv.config();

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected.');
  
  const queryParams = { type: ['apartment', 'villa'] };
  
  const features = new APIFeatures(Property.find({status: 'approved'}), queryParams).filter();
  console.log('Query conditions:', JSON.stringify(features.query.getQuery()));
  
  const props = await features.query;
  console.log('Found types:', props.map(p => p.type));
  
  process.exit();
}

test().catch(console.error);
