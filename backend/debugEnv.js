require('dotenv').config();

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

console.log('Client ID:', CLIENT_ID);
console.log('Client Secret:', CLIENT_SECRET);
