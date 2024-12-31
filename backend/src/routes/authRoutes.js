const express = require('express');
const axios = require('axios');
const User = require('../models/userModel');
const router = express.Router();

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const TWITCH_REDIRECT_URI = process.env.TWITCH_REDIRECT_URI;

// Debug environment variables
console.log('TWITCH_CLIENT_ID:', TWITCH_CLIENT_ID);
console.log('TWITCH_CLIENT_SECRET:', TWITCH_CLIENT_SECRET);
console.log('TWITCH_REDIRECT_URI:', TWITCH_REDIRECT_URI);

// Step 1: Redirect to Twitch OAuth
router.get('/twitch', (req, res) => {
  try {
    const twitchAuthUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${TWITCH_CLIENT_ID}&redirect_uri=${encodeURIComponent(TWITCH_REDIRECT_URI)}&response_type=code&scope=user:read:email`;
    console.log('Generated Twitch Auth URL:', twitchAuthUrl);
    res.redirect(twitchAuthUrl);
  } catch (error) {
    console.error('Error in /auth/twitch route:', error.message);
    res.status(500).send('Failed to initiate Twitch authentication.');
  }
});

// Step 2: Handle Twitch OAuth Callback
router.get('/twitch/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    console.error('Authorization code missing in Twitch callback.');
    return res.status(400).json({ error: 'Authorization code missing from Twitch callback.' });
  }

  try {
    const tokenResponse = await axios.post('https://id.twitch.tv/oauth2/token', null, {
      params: {
        client_id: TWITCH_CLIENT_ID,
        client_secret: TWITCH_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: TWITCH_REDIRECT_URI,
      },
    });

    const { access_token } = tokenResponse.data;

    const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Client-Id': TWITCH_CLIENT_ID,
      },
    });

    const userData = userResponse.data.data[0];
    console.log('Twitch user data:', userData);

    let user = await User.findOne({ twitchId: userData.id });
    if (!user) {
      user = new User({
        twitchId: userData.id,
        username: userData.display_name,
        email: userData.email,
        packs: 0,
        cards: [],
      });
      await user.save();
    }

    req.session.userId = user._id;
    req.session.save(); // Ensure the session is saved
    res.redirect('http://localhost:3000/dashboard');
  } catch (error) {
    console.error('Twitch OAuth Callback Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to authenticate with Twitch.' });
  }
});

module.exports = router;
