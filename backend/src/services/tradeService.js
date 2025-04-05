const mongoose = require('mongoose');
const Trade = require('../models/tradeModel');
const User = require('../models/userModel');
const MarketListing = require('../models/MarketListing');
const { createNotification } = require('../helpers/notificationHelper');
const { sendNotificationToUser } = require('../../notificationService');
const { logAudit } = require('../helpers/auditLogger');

async function createTrade(senderId, { recipient, offeredItems, requestedItems, offeredPacks, requestedPacks }) {
  // Business logic from tradeController.js createTrade
  // Returns { success: true, trade } or { success: false, status, message }
  try {
    // 1) Check if sender and recipient are the same
    if (senderId === recipient) {
      return { success: false, status: 400, message: 'You cannot create a trade with yourself.' };
    }

    const sender = await User.findById(senderId);
    if (!sender) return { success: false, status: 404, message: 'Sender not found' };

    let recipientUser;
    if (mongoose.Types.ObjectId.isValid(recipient)) {
      recipientUser = await User.findById(recipient);
    } else {
      recipientUser = await User.findOne({ username: recipient });
    }
    if (!recipientUser) return { success: false, status: 404, message: 'Recipient not found' };

    if (offeredPacks > sender.packs) {
      return { success: false, status: 400, message: `You only have ${sender.packs} pack(s), but tried to offer ${offeredPacks}.` };
    }
    if (requestedPacks > recipientUser.packs) {
      return { success: false, status: 400, message: `Recipient only has ${recipientUser.packs} pack(s), but you requested ${requestedPacks}.` };
    }

    const offeredCardsDetails = sender.cards.filter(card =>
      offeredItems.includes(card._id.toString())
    );
    if (offeredItems.length !== offeredCardsDetails.length) {
      return { success: false, status: 400, message: 'You are attempting to trade card(s) you do not own.' };
    }

    const requestedCardsDetails = recipientUser.cards.filter(card =>
      requestedItems.includes(card._id.toString())
    );
    if (requestedItems.length !== requestedCardsDetails.length) {
      return { success: false, status: 400, message: 'You requested card(s) the recipient does not own.' };
    }

    const pendingOfferedCards = offeredCardsDetails.filter(card => card.status === 'pending');
    const pendingRequestedCards = requestedCardsDetails.filter(card => card.status === 'pending');
    if (pendingOfferedCards.length > 0 || pendingRequestedCards.length > 0) {
      return { success: false, status: 400, message: 'One or more cards are pending in another trade or listing.' };
    }

    if (
      offeredCardsDetails.length === 0 &&
      requestedCardsDetails.length === 0 &&
      offeredPacks === 0 &&
      requestedPacks === 0
    ) {
      return { success: false, status: 400, message: 'No valid trade data. Neither side is offering anything.' };
    }

    const trade = new Trade({
      sender: sender._id,
      recipient: recipientUser._id,
      offeredItems: offeredCardsDetails.map(c => c._id),
      requestedItems: requestedCardsDetails.map(c => c._id),
      offeredPacks,
      requestedPacks,
      status: 'pending'
    });

    await trade.save();

    await User.updateOne(
      { _id: sender._id, 'cards._id': { $in: offeredCardsDetails.map(c => c._id) } },
      { $set: { 'cards.$[e].status': 'pending' } },
      { arrayFilters: [{ 'e._id': { $in: offeredCardsDetails.map(c => c._id) } }] }
    );

    await User.updateOne(
      { _id: recipientUser._id, 'cards._id': { $in: requestedCardsDetails.map(c => c._id) } },
      { $set: { 'cards.$[e].status': 'pending' } },
      { arrayFilters: [{ 'e._id': { $in: requestedCardsDetails.map(c => c._id) } }] }
    );

    await createNotification(recipientUser._id, {
      type: 'Trade Offer Received',
      message: `You have received a trade offer from ${sender.username}.`,
      link: `/trades/pending`
    });
    sendNotificationToUser(recipientUser._id, {
      type: 'Trade Offer Received',
      message: `You have received a trade offer from ${sender.username}.`,
      link: `/trades/pending`
    });

    logAudit('Trade Created', { tradeId: trade._id, senderId: sender._id, recipientId: recipientUser._id });

    return { success: true, trade };
  } catch (err) {
    return { success: false, status: 500, message: err.message };
  }
}

// Additional service functions for updateTradeStatus, getTradesForUser, getPendingTrades can be added similarly.

module.exports = {
  createTrade
};
