const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Property = require('./models/Property');
const APIFeatures = require('./utils/apiFeatures');

dotenv.config();

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected.');
  
  const queryParams = { price: { gte: '2000000000' } };
  
  const features = new APIFeatures(Property.find({status: 'approved'}), queryParams).filter();
  console.log('Query conditions:', JSON.stringify(features.query.getQuery()));
  
  const props = await features.query;
  console.log('Found:', props.map(p => p.price));
  
  process.exit();
}

test().catch(console.error);
