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
  const includeUnapproved =
    String(req.query.includeUnapproved || 'false') === 'true';

  let baseFilter = {};
  if (!includeCaptains) {
    baseFilter.isCaptain = { $ne: true };
  }
  // Unless explicitly requested by admin, filter out unapproved players so bad entries are restricted
  if (!includeUnapproved && req.query.isApproved === undefined) {
    baseFilter.isApproved = { $ne: false };
  }

  const queryObj = { ...req.query };
  delete queryObj.includeCaptains;
  delete queryObj.includeUnapproved;

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

  if (req.io) {
    req.io.emit('server:players_updated', { action: 'deleted', playerId: req.params.id });
  }

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

  if (req.io) {
    req.io.emit('server:players_updated', { action: 'cleared_all' });
  }

  res.status(200).json({
    status: 'success',
    message: `Deleted ${result.deletedCount} players. All team rosters and captains have been cleanly reset.`,
    deletedCount: result.deletedCount,
  });
});

// APPROVE A SINGLE PLAYER
exports.approvePlayer = catchAsync(async (req, res, next) => {
  const player = await Player.findByIdAndUpdate(
    req.params.id,
    { isApproved: true },
    { new: true, runValidators: true }
  );

  if (!player) {
    return next(new AppError('No player found with that ID', 404));
  }

  if (req.io) {
    req.io.emit('server:player_approved', { player });
    req.io.emit('server:players_updated', { action: 'approved', playerId: player._id });
  }

  res.status(200).json({
    status: 'success',
    message: `${player.name} approved successfully into tournament pool.`,
    data: { player },
  });
});

// BULK APPROVE ALL UNAPPROVED PLAYERS
exports.approveAllPlayers = catchAsync(async (req, res, next) => {
  const result = await Player.updateMany(
    { isApproved: false },
    { $set: { isApproved: true } }
  );

  if (req.io) {
    req.io.emit('server:players_updated', { action: 'bulk_approved', count: result.modifiedCount });
  }

  res.status(200).json({
    status: 'success',
    message: `Approved ${result.modifiedCount} players into the tournament pool.`,
    modifiedCount: result.modifiedCount,
  });
});

// REJECT / DELETE ALL UNAPPROVED PLAYERS
exports.rejectAllUnapprovedPlayers = catchAsync(async (req, res, next) => {
  const result = await Player.deleteMany({ isApproved: false });

  if (req.io) {
    req.io.emit('server:players_updated', { action: 'bulk_rejected', count: result.deletedCount });
  }

  res.status(200).json({
    status: 'success',
    message: `Rejected and removed ${result.deletedCount} unapproved players.`,
    deletedCount: result.deletedCount,
  });
});

// DYNAMIC SYNC FROM GOOGLE FORM / GOOGLE SHEETS
exports.syncGoogleSheet = catchAsync(async (req, res, next) => {
  let { sheetUrl, asUnapproved = true } = req.body;
  if (!sheetUrl || typeof sheetUrl !== 'string') {
    return next(new AppError('Please provide a valid Google Sheet or CSV URL', 400));
  }

  // Convert standard Google Sheet URL to CSV export URL if needed
  let csvUrl = sheetUrl.trim();
  const sheetMatch = csvUrl.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (sheetMatch && !csvUrl.includes('export?format=csv') && !csvUrl.includes('/pub?')) {
    const sheetId = sheetMatch[1];
    const gidMatch = csvUrl.match(/gid=([0-9]+)/);
    const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
    csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gidParam}`;
  }

  // Fetch the CSV data using node's fetch
  let csvText = '';
  try {
    const resp = await fetch(csvUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });
    if (!resp.ok) {
      throw new Error(`Google Sheets responded with HTTP status ${resp.status}`);
    }
    csvText = await resp.text();
  } catch (err) {
    return next(
      new AppError(
        'Failed to fetch from Google Sheet. Make sure the sheet sharing is set to "Anyone with the link can view". Details: ' +
          err.message,
        400
      )
    );
  }

  // Auto-pricing rule helper
  const getAutoBasePrice = (year) => {
    const y = parseInt(year, 10);
    if (y === 1) return 0.5;
    if (y === 2) return 1.0;
    if (y === 3) return 1.5;
    if (y === 4) return 2.0;
    return 0.5;
  };

  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return next(new AppError('The Google Sheet appears empty or only has headers.', 400));
  }

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));
  const nameIdx = headers.findIndex((h) => (h.includes('name') || h.includes('player')) && !h.includes('timestamp'));
  const catIdx = headers.findIndex((h) => h.includes('role') || h.includes('category') || h.includes('skill') || h.includes('playing'));
  const yearIdx = headers.findIndex((h) => h.includes('year') || h.includes('batch') || h.includes('academic') || h.includes('participation'));
  const priceIdx = headers.findIndex((h) => h.includes('price') || h.includes('base') || h.includes('points'));
  const imgIdx = headers.findIndex((h) => h.includes('photo') || h.includes('image') || h.includes('picture') || h.includes('link') || h.includes('url') || h.includes('upload'));

  if (nameIdx === -1) {
    return next(new AppError('Could not find a "Name" or "Full Name" column in the sheet headers.', 400));
  }

  const newPlayersToInsert = [];
  let skippedDuplicates = 0;

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
    const cleanCells = cells.map((c) => c.trim().replace(/^"|"$/g, ''));

    const name = cleanCells[nameIdx]?.trim();
    if (!name) continue;

    // Check if player with same name already exists to prevent duplicate entries
    const existing = await Player.findOne({ name: new RegExp(`^${name}$`, 'i') });
    if (existing) {
      skippedDuplicates++;
      continue;
    }

    let rawCat = catIdx >= 0 && cleanCells[catIdx] ? cleanCells[catIdx] : 'All-Rounder';
    const catLower = rawCat.toLowerCase();
    let category = 'All-Rounder';
    if (catLower.includes('bat')) category = 'Batsman';
    else if (catLower.includes('bowl')) category = 'Bowler';
    else if (catLower.includes('keep') || catLower.includes('wk') || catLower.includes('wicket')) category = 'Wicket-Keeper';

    let year = 1;
    if (yearIdx >= 0 && cleanCells[yearIdx]) {
      const yMatch = cleanCells[yearIdx].match(/\d+/);
      if (yMatch) year = parseInt(yMatch[0], 10);
    }

    let basePrice = getAutoBasePrice(year);
    if (priceIdx >= 0 && cleanCells[priceIdx] && !isNaN(parseFloat(cleanCells[priceIdx]))) {
      basePrice = parseFloat(cleanCells[priceIdx]);
    }

    let image = '';
    if (imgIdx >= 0 && cleanCells[imgIdx]) {
      let rawImg = cleanCells[imgIdx].trim();
      const driveMatch = rawImg.match(/\/d\/([a-zA-Z0-9_-]+)/) || rawImg.match(/id=([a-zA-Z0-9_-]+)/);
      if (driveMatch) {
        image = `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
      } else if (rawImg.startsWith('http')) {
        image = rawImg;
      }
    }
    if (!image) {
      image = `https://via.placeholder.com/200x250?text=${encodeURIComponent(name)}`;
    }

    newPlayersToInsert.push({
      name,
      category,
      year,
      basePrice,
      image,
      status: 'unsold',
      isCaptain: false,
      isApproved: asUnapproved ? false : true,
      bidHistory: [],
    });
  }

  if (newPlayersToInsert.length === 0) {
    return res.status(200).json({
      status: 'success',
      message: skippedDuplicates > 0 
        ? `All ${skippedDuplicates} entries in the sheet already exist in the database.`
        : 'No new player rows found in the sheet.',
      count: 0,
      skippedDuplicates,
      data: { players: [] },
    });
  }

  const inserted = await Player.insertMany(newPlayersToInsert);

  if (req.io) {
    req.io.emit('server:players_updated', {
      action: 'imported',
      count: inserted.length,
      asUnapproved: Boolean(asUnapproved),
    });
  }

  res.status(201).json({
    status: 'success',
    message: `Successfully loaded ${inserted.length} players ${asUnapproved ? 'into Unapproved Pool for review' : 'directly to tournament pool'}${skippedDuplicates > 0 ? ` (${skippedDuplicates} duplicates skipped)` : ''}.`,
    count: inserted.length,
    skippedDuplicates,
    data: { players: inserted },
  });
});

// UPLOAD PLAYERS (CSV or JSON with automatic year-based pricing & approval support)
exports.uploadPlayers = catchAsync(async (req, res, next) => {
  let rawData = req.body.players || req.body.data;
  let fileText = req.file?.buffer ? req.file.buffer.toString('utf8') : req.body.csvText;
  const asUnapproved = req.body.asUnapproved === true || req.body.asUnapproved === 'true';

  const getAutoBasePrice = (year) => {
    const y = parseInt(year, 10);
    if (y === 1) return 0.5;
    if (y === 2) return 1.0;
    if (y === 3) return 1.5;
    if (y === 4) return 2.0;
    return 0.5;
  };

  const playersToInsert = [];

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
        isApproved: asUnapproved ? false : true,
        bidHistory: [],
      });
    }
  } else if (typeof fileText === 'string') {
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
            isApproved: asUnapproved ? false : true,
            bidHistory: [],
          });
        }
      } catch (err) {
        return next(new AppError('Invalid JSON format in file: ' + err.message, 400));
      }
    } else {
      const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        return next(new AppError('Data must include header row and at least 1 player.', 400));
      }

      // Check for vertical Google Forms copy-paste (1 field per line)
      let isVerticalHeaders = false;
      let numVerticalHeaders = 0;
      for (let i = 0; i < Math.min(15, lines.length); i++) {
        const l = lines[i];
        if (/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(l) || (l.includes('@') && !l.toLowerCase().includes('address'))) {
          numVerticalHeaders = i;
          isVerticalHeaders = true;
          break;
        }
      }

      if (isVerticalHeaders && numVerticalHeaders >= 3) {
        const headerNames = lines.slice(0, numVerticalHeaders).map((h) => h.toLowerCase());
        const dataLines = lines.slice(numVerticalHeaders);

        for (let i = 0; i < dataLines.length; i += numVerticalHeaders) {
          const chunk = dataLines.slice(i, i + numVerticalHeaders);
          if (chunk.length < 3) continue;

          const entry = {};
          for (let j = 0; j < Math.min(headerNames.length, chunk.length); j++) {
            entry[headerNames[j]] = chunk[j];
          }

          const nameKey = Object.keys(entry).find(
            (k) => (k.includes('name') || k.includes('player')) && !k.includes('timestamp')
          );
          const name = nameKey ? entry[nameKey].trim() : '';
          if (!name) continue;

          const roleKey = Object.keys(entry).find((k) =>
            k.includes('role') || k.includes('category') || k.includes('skill') || k.includes('playing')
          );
          let rawRole = (roleKey ? entry[roleKey] : 'All-Rounder').toLowerCase();
          let category = 'All-Rounder';
          if (rawRole.includes('bat')) category = 'Batsman';
          else if (rawRole.includes('bowl')) category = 'Bowler';
          else if (rawRole.includes('keep') || rawRole.includes('wk') || rawRole.includes('wicket')) category = 'Wicket-Keeper';

          const yearKey = Object.keys(entry).find((k) =>
            k.includes('year') || k.includes('academic') || k.includes('batch') || k.includes('participation')
          );
          let year = 1;
          if (yearKey && entry[yearKey]) {
            const yMatch = entry[yearKey].match(/\d+/);
            if (yMatch) year = parseInt(yMatch[0], 10);
          }
          const basePrice = getAutoBasePrice(year);

          const photoKey = Object.keys(entry).find((k) =>
            k.includes('photo') || k.includes('image') || k.includes('picture') || k.includes('upload') || k.includes('link') || k.includes('url')
          );
          let image = photoKey ? entry[photoKey] : '';
          const urlMatch = image.match(/https?:\/\/[^\s\)\]]+/);
          if (urlMatch) image = urlMatch[0];
          const driveMatch = image.match(/\/d\/([a-zA-Z0-9_-]+)/) || image.match(/id=([a-zA-Z0-9_-]+)/);
          if (driveMatch) {
            image = `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
          }
          if (!image) {
            image = `https://via.placeholder.com/200x250?text=${encodeURIComponent(name)}`;
          }

          playersToInsert.push({
            name,
            category,
            year,
            basePrice,
            image,
            status: 'unsold',
            isCaptain: false,
            isApproved: asUnapproved ? false : true,
            bidHistory: [],
          });
        }
      } else {

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));
      const nameIdx = headers.findIndex((h) => (h.includes('name') || h.includes('player')) && !h.includes('timestamp'));
      const catIdx = headers.findIndex((h) => h.includes('role') || h.includes('category') || h.includes('skill') || h.includes('playing'));
      const yearIdx = headers.findIndex((h) => h.includes('year') || h.includes('batch') || h.includes('academic') || h.includes('participation'));
      const priceIdx = headers.findIndex((h) => h.includes('price') || h.includes('base') || h.includes('points'));
      const imgIdx = headers.findIndex((h) => h.includes('photo') || h.includes('image') || h.includes('picture') || h.includes('link') || h.includes('url') || h.includes('upload'));

      if (nameIdx === -1) {
        return next(new AppError('Missing required "Name" column in CSV.', 400));
      }

      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
        const cleanCells = cells.map((c) => c.trim().replace(/^"|"$/g, ''));

        const name = cleanCells[nameIdx]?.trim();
        if (!name) continue;

        let category = catIdx >= 0 ? cleanCells[catIdx] : 'All-Rounder';
        const catLower = category.toLowerCase();
        if (catLower.includes('bat')) category = 'Batsman';
        else if (catLower.includes('bowl')) category = 'Bowler';
        else if (catLower.includes('keep') || catLower.includes('wk')) category = 'Wicket-Keeper';
        else category = 'All-Rounder';

        const yearVal = yearIdx >= 0 ? parseInt(cleanCells[yearIdx], 10) : 1;
        const year = isNaN(yearVal) ? 1 : yearVal;

        let basePrice;
        if (priceIdx >= 0 && cleanCells[priceIdx] && !isNaN(parseFloat(cleanCells[priceIdx]))) {
          basePrice = parseFloat(cleanCells[priceIdx]);
        } else {
          basePrice = getAutoBasePrice(year);
        }

        let image = '';
        if (imgIdx >= 0 && cleanCells[imgIdx]) {
          let rawImg = cleanCells[imgIdx].trim();
          const driveMatch = rawImg.match(/\/d\/([a-zA-Z0-9_-]+)/) || rawImg.match(/id=([a-zA-Z0-9_-]+)/);
          if (driveMatch) {
            image = `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
          } else if (rawImg.startsWith('http')) {
            image = rawImg;
          }
        }
        if (!image) {
          image = `https://via.placeholder.com/200x250?text=${encodeURIComponent(name)}`;
        }

        playersToInsert.push({
          name,
          category,
          year,
          basePrice,
          image,
          status: 'unsold',
          isCaptain: false,
          isApproved: asUnapproved ? false : true,
          bidHistory: [],
        });
      }
      }
    }
  }

  if (playersToInsert.length === 0) {
    return next(new AppError('No valid players found in the uploaded file.', 400));
  }

  const created = await Promise.all(playersToInsert.map((p) => Player.create(p)));

  if (req.io) {
    req.io.emit('server:players_updated', {
      action: 'uploaded',
      count: created.length,
      asUnapproved,
    });
  }

  res.status(201).json({
    status: 'success',
    count: created.length,
    message: `Imported ${created.length} players ${asUnapproved ? 'to Unapproved Pool' : 'to tournament pool'}.`,
    data: { players: created },
  });
});
