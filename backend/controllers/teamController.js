const mongoose = require('mongoose');
const Team = require('./../models/teamModel');
const Player = require('./../models/playerModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const handlerFactory = require('./handlerFactory');

// CREATE A NEW Team
exports.createTeam = handlerFactory.createOne(Team);

// GET ALL Teams
exports.getAllTeams = handlerFactory.getAll(Team, [
  { path: 'captain', select: 'name image isCaptain category year' },
  { path: 'players', select: 'name image category isCaptain year finalBidPrice basePrice' },
]);

// GET A SINGLE Team BY ID
exports.getTeam = handlerFactory.getOne(Team, [
  { path: 'captain', select: 'name image isCaptain category year' },
  { path: 'players', select: 'name image category isCaptain year finalBidPrice basePrice' },
]);

// UPDATE A Team
exports.updateTeam = handlerFactory.updateOne(Team);

// DELETE A Team
exports.deleteTeam = handlerFactory.deleteOne(Team);

// ADD player to a team
exports.addPlayerToTeam = catchAsync(async (req, res, next) => {
  const team = await Team.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  if (!team) {
    return next(new AppError('Please check your team Id', 400));
  }
  res.status(200).json({
    status: 'Success',
    body: team,
  });
});

// ASSIGN / RETAIN CAPTAIN FOR A TEAM
exports.assignCaptain = catchAsync(async (req, res, next) => {
  const { id: teamId } = req.params;
  const { playerId } = req.body;
  if (!playerId) {
    return next(new AppError('playerId is required', 400));
  }

  const team = await Team.findById(teamId);
  if (!team) {
    return next(new AppError('Team not found', 404));
  }

  const newCaptain = await Player.findById(playerId);
  if (!newCaptain) {
    return next(new AppError('Player not found', 404));
  }

  // 1. If team already had a different captain, revert previous captain back to unsold non-captain
  if (team.captain && team.captain.toString() !== playerId.toString()) {
    await Player.findByIdAndUpdate(team.captain, {
      $set: {
        isCaptain: false,
        status: 'unsold',
        team: null,
        finalBidPrice: null,
      },
    });
  }

  // 2. Mark new player as captain and retained (status: sold, team: team._id, finalBidPrice: 0)
  await Player.findByIdAndUpdate(playerId, {
    $set: {
      isCaptain: true,
      status: 'sold',
      team: team._id,
      finalBidPrice: 0,
      markedUnsold: false,
      bidHistory: [],
    },
  });

  // 3. Clear newCaptain from any OTHER team if they had them as captain or player
  await Team.updateMany(
    { _id: { $ne: team._id }, captain: newCaptain._id },
    { $unset: { captain: "" }, $pull: { players: newCaptain._id } }
  );

  // 4. Update team: set captain and ensure in players array
  const oldCaptainId = team.captain ? team.captain.toString() : null;
  let currentPlayers = (team.players || []).map((p) => (p._id || p).toString());
  if (oldCaptainId) {
    currentPlayers = currentPlayers.filter((id) => id !== oldCaptainId);
  }
  if (!currentPlayers.includes(playerId.toString())) {
    currentPlayers.push(playerId.toString());
  }

  await Team.collection.updateOne(
    { _id: team._id },
    {
      $set: {
        captain: newCaptain._id,
        budget: 100,
        players: currentPlayers.map((id) => new mongoose.Types.ObjectId(id)),
      },
    }
  );

  // 5. Update captain user account if exists
  try {
    const User = require('../models/userModel');
    await User.findOneAndUpdate(
      { team: team._id, role: 'captain' },
      { $set: { playerProfile: newCaptain._id } }
    );
  } catch (_) {}

  const updatedTeam = await Team.findById(team._id)
    .populate({ path: 'captain', select: 'name image isCaptain category year' })
    .populate({ path: 'players', select: 'name image category isCaptain year finalBidPrice' });

  res.status(200).json({
    status: 'success',
    data: {
      team: updatedTeam,
      player: newCaptain,
    },
  });
});
