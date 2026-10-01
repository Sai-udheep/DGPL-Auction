const Player = require('./../models/playerModel');
const Team = require('./../models/teamModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const APIFeatures = require('./../utils/apiFeatures');
const handlerFactory = require('./handlerFactory');

// CREATE A PLAYER
exports.createPlayer = handlerFactory.createOne(Player);

// GET ALL PLAYERS
exports.getAllPlayers = catchAsync(async (req, res, next) => {
  const includeCaptains =
    String(req.query.includeCaptains || 'false') === 'true';
  const baseFilter = includeCaptains ? {} : { isCaptain: { $ne: true } };

  const queryObj = { ...req.query };
  delete queryObj.includeCaptains;

  const features = new APIFeatures(Player.find(baseFilter), queryObj)
    .filter()
    .sorting()
    .limitFields()
    .pagination();

  features.query = features.query
    .populate({ path: 'team', select: 'name' })
    .populate({ path: 'bidHistory.team', select: 'name' });

  const docs = await features.query;

  res.status(200).json({
    status: 'success',
    results: docs.length,
    data: { players: docs },
  });
});

// GET A SINGLE PLAYER BY ID
exports.getPlayer = catchAsync(async (req, res, next) => {
  const doc = await Player.findById(req.params.id)
    .populate({ path: 'team', select: 'name budget' })
    .populate({ path: 'bidHistory.team', select: 'name' });

  res.status(200).json({
    status: 'success',
    data: { doc },
  });
});

// UPDATE A PLAYER
exports.updatePlayer = handlerFactory.updateOne(Player);

// DELETE A SINGLE PLAYER
exports.deletePlayer = catchAsync(async (req, res, next) => {
  const player = await Player.findById(req.params.id);
  if (!player) {
    return next(new AppError('No player found with that ID', 404));
  }

  // Remove player from any team's roster
  if (player.team) {
    await Team.findByIdAndUpdate(player.team, {
      $pull: { players: player._id },
    });
  }

  await Player.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// DELETE ALL PLAYERS & RESET ROSTERS COMPLETELY (No ghost captains left behind)
exports.deleteAllPlayers = catchAsync(async (req, res, next) => {
  // Wipe all players completely so old dummy captains cannot linger
  const result = await Player.deleteMany({});

  // Reset all teams: 100 budget, no captain, empty roster
  try {
    await Team.collection.updateMany(
      {},
      { $set: { budget: 100, captain: null, players: [] } }
    );
  } catch (_) {}

  res.status(200).json({
    status: 'success',
    message: `Deleted ${result.deletedCount} players. All team rosters and captains have been cleanly reset.`,
    deletedCount: result.deletedCount,
  });
});

// UPLOAD PLAYERS (CSV or JSON with automatic year-based pricing)
exports.uploadPlayers = catchAsync(async (req, res, next) => {
  let rawData = req.body.players || req.body.data;
  let fileText = req.file?.buffer ? req.file.buffer.toString('utf8') : req.body.csvText;

  // Auto-pricing rule helper
  const getAutoBasePrice = (year) => {
    const y = parseInt(year, 10);
    if (y === 1) return 0.5;
    if (y === 2) return 1.0;
    if (y === 3) return 1.5;
    if (y === 4) return 2.0;
    return 0.5;
  };

  const playersToInsert = [];

  // 1. JSON Array input
  if (Array.isArray(rawData)) {
    for (const item of rawData) {
      if (!item.name) continue;
      const year = parseInt(item.year, 10) || 1;
      const basePrice = item.basePrice != null && item.basePrice !== ""
        ? parseFloat(item.basePrice)
        : getAutoBasePrice(year);

      playersToInsert.push({
        name: item.name.trim(),
        category: item.category || 'All-Rounder',
        year,
        basePrice,
        image: item.image || `https://via.placeholder.com/200x250?text=${encodeURIComponent(item.name)}`,
        status: 'unsold',
        isCaptain: false,
        bidHistory: [],
      });
    }
  } 
  // 2. CSV / Plaintext input
  else if (typeof fileText === 'string') {
    // Check if JSON text was passed in file
    const trimmed = fileText.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsedJson = JSON.parse(trimmed);
        for (const item of parsedJson) {
          if (!item.name) continue;
          const year = parseInt(item.year, 10) || 1;
          const basePrice = item.basePrice != null && item.basePrice !== ""
            ? parseFloat(item.basePrice)
            : getAutoBasePrice(year);

          playersToInsert.push({
            name: item.name.trim(),
            category: item.category || 'All-Rounder',
            year,
            basePrice,
            image: item.image || `https://via.placeholder.com/200x250?text=${encodeURIComponent(item.name)}`,
            status: 'unsold',
            isCaptain: false,
            bidHistory: [],
          });
        }
      } catch (err) {
        return next(new AppError('Invalid JSON format in file: ' + err.message, 400));
      }
    } else {
      // Parse CSV lines
      const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        return next(new AppError('CSV must include header row and at least 1 player.', 400));
      }

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));
      const nameIdx = headers.findIndex((h) => h.includes('name') || h.includes('player'));
      const catIdx = headers.findIndex((h) => h.includes('role') || h.includes('category') || h.includes('skill'));
      const yearIdx = headers.findIndex((h) => h.includes('year') || h.includes('batch') || h.includes('academic'));
      const priceIdx = headers.findIndex((h) => h.includes('price') || h.includes('base') || h.includes('points'));
      const imgIdx = headers.findIndex((h) => h.includes('photo') || h.includes('image') || h.includes('picture') || h.includes('link') || h.includes('url'));

      if (nameIdx === -1) {
        return next(new AppError('Missing required "Name" column in CSV.', 400));
      }

      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
        const cleanCells = cells.map((c) => c.trim().replace(/^"|"$/g, ''));

        const name = cleanCells[nameIdx];
        if (!name) continue;

        let category = catIdx >= 0 ? cleanCells[catIdx] : 'All-Rounder';
        const catLower = category.toLowerCase();
        if (catLower.includes('bat')) category = 'Batsman';
        else if (catLower.includes('bowl')) category = 'Bowler';
        else if (catLower.includes('keep') || catLower.includes('wk')) category = 'Wicket-Keeper';
        else category = 'All-Rounder';

        const yearVal = yearIdx >= 0 ? parseInt(cleanCells[yearIdx], 10) : 1;
        const year = isNaN(yearVal) ? 1 : yearVal;

        // Auto base price based on year if not provided
        let basePrice;
        if (priceIdx >= 0 && cleanCells[priceIdx] && !isNaN(parseFloat(cleanCells[priceIdx]))) {
          basePrice = parseFloat(cleanCells[priceIdx]);
        } else {
          basePrice = getAutoBasePrice(year);
        }

        const image = imgIdx >= 0 && cleanCells[imgIdx]
          ? cleanCells[imgIdx]
          : `https://via.placeholder.com/200x250?text=${encodeURIComponent(name)}`;

        playersToInsert.push({
          name,
          category,
          year,
          basePrice,
          image,
          status: 'unsold',
          isCaptain: false,
          bidHistory: [],
        });
      }
    }
  }

  if (playersToInsert.length === 0) {
    return next(new AppError('No valid players found in the uploaded file.', 400));
  }

  const created = await Promise.all(playersToInsert.map((p) => Player.create(p)));

  res.status(201).json({
    status: 'success',
    count: created.length,
    data: { players: created },
  });
});
