const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Team name is required'],
    unique: true,
    trim: true,
  },
  captain: {
    type: mongoose.Schema.ObjectId,
    ref: 'Player',
  },
  image: {
    type: String,
  },
  budget: {
    type: Number,
    default: 100,
  },
  players: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'Player',
    },
  ],
});

// Index to speed up captain lookups
teamSchema.index({ captain: 1 });

// Ensure the captain is always included in the players list when saving a Team
teamSchema.pre('save', function (next) {
  try {
    if (this.captain) {
      const cap = this.captain.toString();
      this.players = this.players || [];
      const hasCap = this.players.some((p) => p && p.toString() === cap);
      if (!hasCap) this.players.push(this.captain);
    }
  } catch (_) {
    // ignore
  }
  next();
});

// Ensure updates that set a captain also include them in players
teamSchema.pre('findOneAndUpdate', function (next) {
  try {
    const update = this.getUpdate() || {};
    // Support both direct set and $set
    const newCaptain = update.captain || (update.$set && update.$set.captain);
    if (newCaptain) {
      const capStr = newCaptain.toString();
      // If update or update.$set explicitly specifies players array, ensure captain is in it
      if (Array.isArray(update.players)) {
        if (!update.players.some((p) => p && p.toString() === capStr)) {
          update.players.push(newCaptain);
        }
      } else if (update.$set && Array.isArray(update.$set.players)) {
        if (!update.$set.players.some((p) => p && p.toString() === capStr)) {
          update.$set.players.push(newCaptain);
        }
      } else {
        // Only use $addToSet if players is NOT in $set / direct update
        if (!update.$addToSet) update.$addToSet = {};
        const addToSet = update.$addToSet;
        if (addToSet.players && addToSet.players.$each) {
          const arr = addToSet.players.$each;
          if (!arr.some((p) => p && p.toString() === capStr)) {
            arr.push(newCaptain);
          }
        } else if (addToSet.players && !addToSet.players.$each) {
          const existing = addToSet.players;
          if (existing.toString() !== capStr) {
            addToSet.players = { $each: [existing, newCaptain] };
          }
        } else {
          addToSet.players = newCaptain;
        }
      }
      this.setUpdate(update);
    }
  } catch (_) {
    // ignore
  }
  next();
});

const Team = mongoose.model('Team', teamSchema);

module.exports = Team;
