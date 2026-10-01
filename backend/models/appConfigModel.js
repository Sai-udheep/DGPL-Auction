const mongoose = require('mongoose');

const appConfigSchema = new mongoose.Schema(
  {
    sessionsInvalidatedAt: { type: Date, default: Date.now },
    isAuctionActive: { type: Boolean, default: false },
    tournamentTitle: { type: String, default: 'DGPL Season 11' },
    tournamentMode: { type: String, default: 'Official Auction' },
  },
  { collection: 'appconfig' }
);

module.exports = mongoose.models.AppConfig || mongoose.model('AppConfig', appConfigSchema);
