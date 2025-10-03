const mongoose = require('mongoose');
const Trade = require('../models/tradeModel');
const User = require('../models/userModel');
const { createNotification } = require('../helpers/notificationHelper');
const { sendNotificationToUser } = require('../../notificationService');
const { logAudit } = require('../helpers/auditLogger');

async function createTrade(senderId, { recipient, offeredItems, requestedItems, offeredPacks, requestedPacks, counterOf }) {
    try {
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

        if (recipientUser._id.toString() === senderId) {
            return { success: false, status: 400, message: 'You cannot create a trade with yourself.' };
        }

        const offeredItemsSnapshot = [];
        for (const cardId of offeredItems) {
            const card = sender.cards.find(c => c._id.equals(cardId));
            if (card) {
                offeredItemsSnapshot.push({
                    originalId: card._id,
                    name: card.name,
                    rarity: card.rarity,
                    mintNumber: card.mintNumber,
                    imageUrl: card.imageUrl
                });
            }
        }

        const requestedItemsSnapshot = [];
        for (const cardId of requestedItems) {
            const card = recipientUser.cards.find(c => c._id.equals(cardId));
            if (card) {
                requestedItemsSnapshot.push({
                    originalId: card._id,
                    name: card.name,
                    rarity: card.rarity,
                    mintNumber: card.mintNumber,
                    imageUrl: card.imageUrl
                });
            }
        }

        if (offeredPacks > sender.packs) {
            return { success: false, status: 400, message: `You only have ${sender.packs} pack(s), but tried to offer ${offeredPacks}.` };
        }
        if (requestedPacks > recipientUser.packs) {
            return { success: false, status: 400, message: `Recipient only has ${recipientUser.packs} pack(s), but you requested ${requestedPacks}.` };
        }

        let counterTrade = null;
        if (counterOf) {
            counterTrade = await Trade.findById(counterOf);
            if (!counterTrade) {
                return { success: false, status: 404, message: 'Original trade not found' };
            }
            if (counterTrade.status !== 'pending') {
                return { success: false, status: 400, message: 'Original trade is not pending' };
            }
            if (
                counterTrade.sender.toString() !== senderId &&
                counterTrade.recipient.toString() !== senderId
            ) {
                return { success: false, status: 403, message: 'Not a participant of the original trade' };
            }
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

        const pendingOfferedCards = offeredCardsDetails.filter(card => {
            if (card.status !== 'pending') return false;
            if (counterTrade && (
                counterTrade.offeredItems.some(id => id.equals(card._id)) ||
                counterTrade.requestedItems.some(id => id.equals(card._id))
            )) {
                return false;
            }
            return true;
        });
        const pendingRequestedCards = requestedCardsDetails.filter(card => {
            if (card.status !== 'pending') return false;
            if (counterTrade && (
                counterTrade.offeredItems.some(id => id.equals(card._id)) ||
                counterTrade.requestedItems.some(id => id.equals(card._id))
            )) {
                return false;
            }
            return true;
        });
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
            offeredItemsSnapshot,
            requestedItemsSnapshot,
            offeredPacks,
            requestedPacks,
            status: 'pending'
        });

        await trade.save();

        await User.updateOne(
            { _id: sender._id },
            { $set: { 'cards.$[elem].status': 'pending' } },
            { arrayFilters: [{ 'elem._id': { $in: offeredCardsDetails.map(c => c._id) } }] }
        );

        await User.updateOne(
            { _id: recipientUser._id },
            { $set: { 'cards.$[elem].status': 'pending' } },
            { arrayFilters: [{ 'elem._id': { $in: requestedCardsDetails.map(c => c._id) } }] }
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

async function updateTradeStatus(tradeId, userId, newStatus, cancellationReason = '') {
    const session = await mongoose.startSession();
    try {
        let resultTrade;
        await session.withTransaction(async () => {
            const trade = await Trade.findById(tradeId).populate('sender recipient').session(session);

            if (!trade) throw { status: 404, message: 'Trade not found' };
            if (trade.status !== 'pending') throw { status: 400, message: 'This trade is no longer pending.' };

            const isSender = trade.sender._id.toString() === userId;
            const isRecipient = trade.recipient._id.toString() === userId;

            if (newStatus === 'cancelled' && !isSender) throw { status: 403, message: 'Only the sender can cancel this trade.' };
            if ((newStatus === 'accepted' || newStatus === 'rejected') && !isRecipient) throw { status: 403, message: 'Only the recipient can accept or reject this trade.' };

            if (newStatus === 'rejected' || newStatus === 'cancelled') {
                const updates = [];
                if (trade.offeredItems.length > 0) {
                    updates.push(User.updateOne({ _id: trade.sender._id }, { $set: { 'cards.$[elem].status': 'available' } }, { arrayFilters: [{ 'elem._id': { $in: trade.offeredItems } }], session }));
                }
                if (trade.requestedItems.length > 0) {
                    updates.push(User.updateOne({ _id: trade.recipient._id }, { $set: { 'cards.$[elem].status': 'available' } }, { arrayFilters: [{ 'elem._id': { $in: trade.requestedItems } }], session }));
                }
                await Promise.all(updates);

                trade.status = newStatus;
                if (cancellationReason) trade.cancellationReason = cancellationReason;

            } else if (newStatus === 'accepted') {
                const { sender, recipient, offeredItems, requestedItems, offeredPacks, requestedPacks } = trade;

                if (sender.packs < offeredPacks) throw { status: 400, message: `${sender.username} no longer has enough packs.` };
                if (recipient.packs < requestedPacks) throw { status: 400, message: `${recipient.username} no longer has enough packs.` };

                const senderOfferedCards = sender.cards.filter(c => offeredItems.some(id => id.equals(c._id)));
                const recipientRequestedCards = recipient.cards.filter(c => requestedItems.some(id => id.equals(c._id)));

                if (senderOfferedCards.length !== offeredItems.length || recipientRequestedCards.length !== requestedItems.length) {
                    throw { status: 400, message: 'One or more cards in the trade are no longer available.' };
                }

                const newCardsForSender = recipientRequestedCards.map(c => { const newCard = c.toObject(); delete newCard._id; newCard.status = 'available'; newCard.acquiredAt = new Date(); return newCard; });
                const newCardsForRecipient = senderOfferedCards.map(c => { const newCard = c.toObject(); delete newCard._id; newCard.status = 'available'; newCard.acquiredAt = new Date(); return newCard; });

                const senderUpdate = {
                    $pull: { cards: { _id: { $in: offeredItems } } },
                    $inc: { packs: requestedPacks - offeredPacks },
                    ...(newCardsForSender.length > 0 && { $push: { cards: { $each: newCardsForSender } } })
                };

                const recipientUpdate = {
                    $pull: { cards: { _id: { $in: requestedItems } } },
                    $inc: { packs: offeredPacks - requestedPacks },
                    ...(newCardsForRecipient.length > 0 && { $push: { cards: { $each: newCardsForRecipient } } })
                };

                await User.updateOne({ _id: sender._id }, senderUpdate, { session });
                await User.updateOne({ _id: recipient._id }, recipientUpdate, { session });

                trade.status = 'accepted';
            }

            await trade.save({ session });
            resultTrade = trade;
        });

        session.endSession();

        if (resultTrade) {
            logAudit(`Trade ${newStatus}`, { tradeId: resultTrade._id, userId });
            if (newStatus === 'rejected') {
                // Save the notification to the database first
                await createNotification(resultTrade.sender._id, {
                    type: 'Trade Rejected',
                    message: `Your trade offer to ${resultTrade.recipient.username} was rejected.`,
                    link: `/trades/pending`
                });
                // Then send the real-time push notification
                sendNotificationToUser(resultTrade.sender._id, {
                    type: 'Trade Rejected',
                    message: `Your trade offer to ${resultTrade.recipient.username} was rejected.`,
                    link: `/trades/pending`
                });
            }
            else if (newStatus === 'cancelled') {
                await createNotification(resultTrade.recipient._id, {
                    type: 'Trade Cancelled',
                    message: `A trade offer from ${resultTrade.sender.username} was cancelled.`,
                    link: `/trades/pending`
                });
                sendNotificationToUser(resultTrade.recipient._id, {
                    type: 'Trade Cancelled',
                    message: `A trade offer from ${resultTrade.sender.username} was cancelled.`,
                    link: `/trades/pending`
                });
            }
            else if (newStatus === 'accepted') {
                // Notification for the sender
                await createNotification(resultTrade.sender._id, {
                    type: 'Trade Accepted',
                    message: `Your trade with ${resultTrade.recipient.username} was accepted!`,
                    link: `/trades/pending`
                });
                sendNotificationToUser(resultTrade.sender._id, {
                    type: 'Trade Accepted',
                    message: `Your trade with ${resultTrade.recipient.username} was accepted!`,
                    link: `/trades/pending`
                });

                // Notification for the recipient
                await createNotification(resultTrade.recipient._id, {
                    type: 'Trade Accepted',
                    message: `You accepted the trade with ${resultTrade.sender.username}!`,
                    link: `/trades/pending`
                });
                sendNotificationToUser(resultTrade.recipient._id, {
                    type: 'Trade Accepted',
                    message: `You accepted the trade with ${resultTrade.sender.username}!`,
                    link: `/trades/pending`
                });
            }
        }

        return { success: true, trade: resultTrade };

    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        session.endSession();
        console.error('Error updating trade status:', error);
        return { success: false, status: error.status || 500, message: error.message || 'Server error' };
    }
}

module.exports = {
    createTrade,
    updateTradeStatus
};
