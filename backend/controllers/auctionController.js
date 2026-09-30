const mongoose = require('mongoose');
const Player = require('../models/playerModel');
const Team = require('../models/teamModel');
const AppConfig = require('../models/appConfigModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// 1. GET GLOBAL AUCTION STATUS - never throws 500, always returns safe defaults
exports.getAuctionStatus = async (req, res, _next) => {
  let isAuctionActive = false;
  let currentPlayerId = null;
  try {
    const cfg = await AppConfig.findOne().lean();
    if (cfg) isAuctionActive = !!cfg.isAuctionActive;
  } catch (e) {
    console.error('[Auction] AppConfig read error:', e.message);
  }
  try {
    const inAuction = await Player.findOne({ status: 'in_auction' }).select('_id').lean();
    if (inAuction) currentPlayerId = inAuction._id;
  } catch (e) {
    console.error('[Auction] Player in_auction read error:', e.message);
  }
  return res.status(200).json({ status: 'success', data: { isAuctionActive, currentPlayerId } });
};

// 2. TOGGLE / SET GLOBAL AUCTION STATUS (Start/Pause Session)
exports.setAuctionStatus = catchAsync(async (req, res, next) => {
  const { isAuctionActive } = req.body;
  if (typeof isAuctionActive !== 'boolean') {
    return next(new AppError('isAuctionActive boolean is required', 400));
  }

  try {
    await AppConfig.findOneAndUpdate(
      {},
      { $set: { isAuctionActive } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (err) {
    console.error('[Auction] Error updating AppConfig in setAuctionStatus:', err);
  }

  if (req.io) {
    console.log('[Auction] Emitting server:auction_status_changed', isAuctionActive);
    req.io.emit('server:auction_status_changed', { isAuctionActive });
  }

  res.status(200).json({
    status: 'success',
    data: { isAuctionActive },
  });
});

// 3. START AUCTION FOR A PLAYER
exports.startAuction = catchAsync(async (req, res, next) => {
  const { playerId } = req.body;
  if (!playerId) return next(new AppError('playerId is required', 400));

  const player = await Player.findById(playerId);
  if (!player) return next(new AppError('Player not found', 404));
  if (player.status === 'sold') {
    return next(new AppError('Player already sold', 400));
  }
  // Don't allow starting auction for a permanently unsold player
  if (player.status === 'unsold' && player.markedUnsold) {
    return next(new AppError('This player has been permanently marked unsold and cannot be re-auctioned.', 400));
  }

  // Ensure global session is active when a player is started
  try {
    await AppConfig.findOneAndUpdate(
      {},
      { $set: { isAuctionActive: true } },
      { upsert: true }
    );
  } catch (err) {
    console.error('[Auction] Error updating AppConfig in startAuction:', err);
  }

  // Clear any existing in_auction player back to unsold (not permanent)
  await Player.updateMany(
    { status: 'in_auction' },
    { $set: { status: 'unsold', bidHistory: [] } }
  );

  player.status = 'in_auction';
  player.bidHistory = [];
  player.markedUnsold = false;
  await player.save();

  const populated = await Player.findById(player._id)
    .populate({ path: 'bidHistory.team', select: 'name' })
    .populate({ path: 'team', select: 'name' });

  if (req.io) {
    const plain = populated.toObject({ getters: true, virtuals: false });
    if (Array.isArray(plain.bidHistory)) {
      plain.bidHistory = plain.bidHistory.map((b) => ({
        ...b,
        teamName: b.team?.name || b.teamName || 'Unknown Team',
      }));
    }
    if (plain.team && plain.team.name) plain.teamName = plain.team.name;
    console.log('[Auction] Emitting new_player', plain.name, plain._id);
    req.io.emit('new_player', plain);
    req.io.emit('server:auction_status_changed', { isAuctionActive: true, currentPlayerId: plain._id });
  }

  res.status(200).json({
    status: 'success',
    data: { player: populated },
  });
});

// 4. GET CURRENT AUCTION PLAYER
exports.getCurrentAuctionPlayer = catchAsync(async (req, res, next) => {
  const player = await Player.findOne({ status: 'in_auction' })
    .populate({ path: 'bidHistory.team', select: 'name' })
    .populate({ path: 'team', select: 'name' });
  let shaped = null;
  if (player) {
    shaped = player.toObject({ getters: true, virtuals: false });
    if (Array.isArray(shaped.bidHistory)) {
      shaped.bidHistory = shaped.bidHistory.map((b) => ({
        ...b,
        teamName: b.team?.name || b.teamName || 'Unknown Team',
      }));
    }
    if (shaped.team && shaped.team.name) shaped.teamName = shaped.team.name;
  }
  res.status(200).json({
    status: 'success',
    data: { player: shaped },
  });
});

// 5. SELL / FINALIZE PLAYER
exports.sellPlayer = catchAsync(async (req, res, next) => {
  let { playerId, teamId, finalBid, finalBidPrice } = req.body;
  if (!playerId) {
    return next(new AppError('playerId is required', 400));
  }

  const player = await Player.findById(playerId);
  if (!player) return next(new AppError('Player not found', 404));
  if (player.status === 'sold') return next(new AppError('Player already sold', 400));
  if (player.status !== 'in_auction') {
    return next(new AppError('Player is not currently in auction', 400));
  }

  // Auto-derive team and winning bid from latest bid history if not passed
  if (!teamId || finalBid == null) {
    if (Array.isArray(player.bidHistory) && player.bidHistory.length > 0) {
      const topBid = player.bidHistory[player.bidHistory.length - 1];
      if (!teamId) teamId = topBid.team?._id || topBid.team;
      if (finalBid == null) finalBid = topBid.bidAmount;
    }
  }
  if (finalBid == null && finalBidPrice != null) {
    finalBid = finalBidPrice;
  }

  if (!teamId || finalBid == null) {
    return next(new AppError('No bids placed for this player. Use "Mark Unsold" instead.', 400));
  }

  finalBid = parseFloat(finalBid);
  const team = await Team.findById(teamId);
  if (!team) return next(new AppError('Winning team not found', 404));
  if (team.budget != null && team.budget < finalBid) {
    return next(
      new AppError(
        `Team ${team.name} does not have enough budget (${team.budget} Pts) for ${finalBid} Pts`,
        400
      )
    );
  }

  // Update Team
  const updatedTeam = await Team.findByIdAndUpdate(
    team._id,
    {
      $addToSet: { players: player._id },
      $inc: { budget: -finalBid },
    },
    { new: true }
  );

  // Update Player
  const updatedPlayer = await Player.findByIdAndUpdate(
    player._id,
    {
      $set: {
        status: 'sold',
        team: updatedTeam._id,
        finalBidPrice: finalBid,
        markedUnsold: false,
      },
    },
    { new: true }
  );

  const populatedPlayer = await Player.findById(updatedPlayer._id)
    .populate({ path: 'bidHistory.team', select: 'name' })
    .populate({ path: 'team', select: 'name budget' });

  const playerPlain = populatedPlayer.toObject({
    getters: true,
    virtuals: false,
  });
  if (Array.isArray(playerPlain.bidHistory)) {
    playerPlain.bidHistory = playerPlain.bidHistory.map((b) => ({
      ...b,
      teamName: b.team?.name || b.teamName || 'Unknown Team',
    }));
  }
  if (playerPlain.team && playerPlain.team.name) {
    playerPlain.teamName = playerPlain.team.name;
  }

  // Mark auction session inactive now that player is sold
  try {
    await AppConfig.findOneAndUpdate(
      {},
      { $set: { isAuctionActive: false } },
      { upsert: true }
    );
  } catch (e) {
    console.error('[Auction] Could not update AppConfig after sell:', e);
  }

  if (req.io) {
    console.log(
      '[Auction] Emitting server:player_sold and player_sold',
      playerPlain.name
    );
    const soldPayload = {
      player: playerPlain,
      team: {
        id: updatedTeam._id,
        name: updatedTeam.name,
        budget: updatedTeam.budget,
        players: updatedTeam.players,
      },
    };
    req.io.emit('server:player_sold', soldPayload);
    req.io.emit('player_sold', soldPayload);
    req.io.emit('server:auction_status_changed', { isAuctionActive: false, currentPlayerId: null });
  }

  res.status(200).json({
    status: 'success',
    data: {
      player: playerPlain,
      team: updatedTeam,
    },
  });
});

// 6. MARK PLAYER UNSOLD (permanently — won't re-enter auction pool)
exports.markPlayerUnsold = catchAsync(async (req, res, next) => {
  const { playerId } = req.body;
  if (!playerId) return next(new AppError('playerId is required', 400));

  const player = await Player.findById(playerId);
  if (!player) return next(new AppError('Player not found', 404));
  if (player.status !== 'in_auction') {
    return next(new AppError('Player is not currently in auction', 400));
  }

  // Mark as permanently unsold — clear bid history since they'll be skipped
  player.status = 'unsold';
  player.markedUnsold = true;
  player.bidHistory = [];
  player.team = null;
  player.finalBidPrice = null;
  await player.save();

  const populated = await Player.findById(player._id)
    .populate({ path: 'bidHistory.team', select: 'name' })
    .populate({ path: 'team', select: 'name' });

  const plain = populated.toObject({ getters: true, virtuals: false });
  if (Array.isArray(plain.bidHistory)) {
    plain.bidHistory = plain.bidHistory.map((b) => ({
      ...b,
      teamName: b.team?.name || b.teamName || 'Unknown Team',
    }));
  }
  if (plain.team && plain.team.name) plain.teamName = plain.team.name;

  // Mark auction inactive
  try {
    await AppConfig.findOneAndUpdate(
      {},
      { $set: { isAuctionActive: false } },
      { upsert: true }
    );
  } catch (e) {
    console.error('[Auction] Could not update AppConfig after unsold:', e);
  }

  if (req.io) {
    console.log(
      '[Auction] Emitting server:player_unsold and player_unsold',
      plain.name
    );
    req.io.emit('server:player_unsold', plain);
    req.io.emit('player_unsold', plain);
    req.io.emit('server:auction_status_changed', { isAuctionActive: false, currentPlayerId: null });
  }

  res.status(200).json({
    status: 'success',
    data: { player: plain },
  });
});

// 7. RESET ENTIRE AUCTION
exports.resetAuction = catchAsync(async (req, res, next) => {
  try {
    // 1. Reset ALL non-captain players to available (unsold, not permanently marked)
    await Player.updateMany(
      { isCaptain: { $ne: true } },
      {
        $set: {
          status: 'unsold',
          team: null,
          finalBidPrice: null,
          bidHistory: [],
          markedUnsold: false,
        },
      }
    );

    // 2. Restore any captain stuck in in_auction back to sold
    await Player.updateMany(
      { isCaptain: true, status: 'in_auction' },
      { $set: { status: 'sold' } }
    );

    // 3. Reset all teams: budget to 100 and players array to only captain
    // Use Team.collection.updateOne to bypass the pre-findOneAndUpdate middleware
    // which conflicts with $set.players
    const allTeams = await Team.find().lean();
    for (const t of allTeams) {
      const captainPlayers = t.captain ? [t.captain] : [];
      await Team.collection.updateOne(
        { _id: t._id },
        { $set: { budget: 100, players: captainPlayers } }
      );
    }

    // 4. Update AppConfig status to inactive
    await AppConfig.findOneAndUpdate(
      {},
      { $set: { isAuctionActive: false } },
      { upsert: true }
    );
  } catch (err) {
    console.error('[Auction] Reset error:', err);
    return next(new AppError('Failed to reset auction: ' + err.message, 500));
  }

  // 5. Broadcast reset event to all connected clients
  if (req.io) {
    console.log('[Auction] Emitting server:auction_reset');
    req.io.emit('server:auction_reset', { message: 'Auction has been reset' });
    req.io.emit('server:auction_status_changed', { isAuctionActive: false, currentPlayerId: null });
  }

  res.status(200).json({
    status: 'success',
    message: 'Auction reset successfully',
  });
});
