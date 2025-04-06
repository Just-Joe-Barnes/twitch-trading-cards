const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const MarketListing = require('../models/MarketListing');

async function forceCancel() {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    const result = await MarketListing.updateOne(
      { _id: '67dc6e74ae46efd9fd2f89a0' },
      {
        $set: {
          status: 'cancelled',
          cancellationReason: 'Force cancelled by admin',
          offers: [],
        },
      }
    );
    console.log('Force cancelled listing 67dc6e74ae46efd9fd2f89a0:', result);
  } catch (error) {
    console.error('Error force cancelling listing:', error);
  } finally {
    mongoose.disconnect();
  }
}

forceCancel();
