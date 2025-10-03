const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    value: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },
}, { timestamps: true });

settingsSchema.statics.initialize = async function() {
    const Setting = this;
    const maintenance = await Setting.findOne({ key: 'maintenanceMode' });
    if (!maintenance) {
        await Setting.create({ key: 'maintenanceMode', value: false });
        console.log('[DB] Initialized maintenanceMode setting to false.');
    }
};

module.exports = mongoose.model('Setting', settingsSchema);
