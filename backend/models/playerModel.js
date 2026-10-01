const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Player name is required'],
    trim: true,
  },
  isCaptain: {
    type: Boolean,
    default: false,
  },
  isApproved: {
    type: Boolean,
    default: true,
  },
  year: {
    type: Number,
  },
  image: {
    type: String,
  },
  category: {
    type: String,
    required: [true, 'Player category is required'],
    enum: {
      values: ['Batsman', 'Bowler', 'All-Rounder', 'Wicket-Keeper'],
      message:
        'Category must be either Batsman, Bowler, All-Rounder, or Wicket-Keeper',
    },
  },
  basePrice: {
    type: Number,
    required: [
      function () {
        return Boolean(this && this.isCaptain === false);
      },
      'A non-captain player must have a base price',
    ],
  },
  status: {
    type: String,
    enum: {
      values: ['unsold', 'sold', 'in_auction'],
      message: 'Status must be either unsold, sold, or in_auction',
    },
    default: 'unsold',
  },
  // When true, this player was explicitly marked unsold and should not be re-auctioned
  markedUnsold: {
    type: Boolean,
    default: false,
  },
  team: {
    type: mongoose.Schema.ObjectId,
    ref: 'Team',
    default: null,
  },
  finalBidPrice: {
    type: Number,
  },
  bidHistory: [
    {
      team: {
        type: mongoose.Schema.ObjectId,
        ref: 'Team',
        required: true,
      },
      bidAmount: {
        type: Number,
        required: true,
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

// Pre-validation hook to normalize category and ensure valid basePrice
playerSchema.pre('validate', function (next) {
  if (this.category) {
    const s = String(this.category).trim().toLowerCase();
    if (s.includes('wk') || s.includes('keep') || s.includes('wicket')) {
      this.category = 'Wicket-Keeper';
    } else if (s.includes('bat')) {
      this.category = 'Batsman';
    } else if (s.includes('bowl')) {
      this.category = 'Bowler';
    } else {
      this.category = 'All-Rounder';
    }
  } else {
    this.category = 'All-Rounder';
  }

  // Ensure year is 1, 2, 3, or 4
  if (this.year != null) {
    const y = parseInt(this.year, 10);
    this.year = isNaN(y) ? 1 : Math.max(1, Math.min(4, y));
  }

  // Auto-fill basePrice if missing or captain
  if (this.isCaptain) {
    this.basePrice = 0;
  } else if (this.basePrice == null || isNaN(this.basePrice)) {
    const y = this.year || 1;
    this.basePrice = y === 1 ? 0.5 : y === 2 ? 1.0 : y === 3 ? 1.5 : 2.0;
  }

  next();
});

// Index to optimize queries filtering by status (e.g., unsold/in_auction)
playerSchema.index({ status: 1 });
playerSchema.index({ markedUnsold: 1 });
playerSchema.index({ isApproved: 1 });

const Player = mongoose.model('Player', playerSchema);
module.exports = Player;
