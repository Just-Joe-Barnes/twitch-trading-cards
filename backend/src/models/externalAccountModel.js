const mongoose = require('mongoose');

const externalAccountSchema = new mongoose.Schema(
    {
        provider: { type: String, required: true, index: true },
        providerUserId: { type: String, required: true, index: true },
        username: { type: String },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
        coinBalance: { type: Number, default: 0 },
        pendingPacks: { type: Number, default: 0 },
        totalCoins: { type: Number, default: 0 },
        totalPacksAwarded: { type: Number, default: 0 },
        lastEventAt: { type: Date },
    },
    { timestamps: true }
);

externalAccountSchema.index({ provider: 1, providerUserId: 1 }, { unique: true });

const ExternalAccount = mongoose.model('ExternalAccount', externalAccountSchema);

module.exports = ExternalAccount;
