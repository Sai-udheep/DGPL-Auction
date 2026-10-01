const mongoose = require('mongoose');

const appConfigSchema = new mongoose.Schema(
  {
    sessionsInvalidatedAt: { type: Date, default: Date.now },
    isAuctionActive: { type: Boolean, default: false },
  },
  { collection: 'appconfig' }
);

module.exports = mongoose.models.AppConfig || mongoose.model('AppConfig', appConfigSchema);
