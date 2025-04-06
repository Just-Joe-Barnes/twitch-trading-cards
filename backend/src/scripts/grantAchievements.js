const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('../models/userModel');
const { checkAndGrantAchievements } = require('../helpers/achievementHelper');

async function grantAchievementsToAllUsers() {
  const uri = process.env.MONGO_URI || process.env.Mongo_uri || 'mongodb+srv://jobybarnes1:Qazwsx4321!@cluster0.lrqb8.mongodb.net/';
  if (!uri) {
    console.error('MongoDB URI not found in environment variables.');
    process.exit(1);
  }
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    const users = await User.find();
    console.log(`Found ${users.length} users.`);

    for (const user of users) {
      console.log(`Checking achievements for ${user.username} (${user._id})`);
      await checkAndGrantAchievements(user);
    }

    console.log('Retroactive achievement granting complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error granting achievements:', error);
    process.exit(1);
  }
}

grantAchievementsToAllUsers();
