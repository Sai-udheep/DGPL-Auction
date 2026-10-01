const express = require('express');
const authController = require('../controllers/authController');
const auctionController = require('../controllers/auctionController');

const router = express.Router();

router.get('/status', auctionController.getAuctionStatus);

router.post(
  '/status',
  authController.protect,
  authController.restrictTo('admin'),
  auctionController.setAuctionStatus
);

router.post(
  '/reset',
  authController.protect,
  authController.restrictTo('admin'),
  auctionController.resetAuction
);

router.post(
  '/start',
  authController.protect,
  authController.restrictTo('admin'),
  auctionController.startAuction
);

router.get('/current', auctionController.getCurrentAuctionPlayer);

router.post(
  '/sell',
  authController.protect,
  authController.restrictTo('admin'),
  auctionController.sellPlayer
);

router.post(
  '/unsold',
  authController.protect,
  authController.restrictTo('admin'),
  auctionController.markPlayerUnsold
);

router.post(
  '/cancel-player',
  authController.protect,
  authController.restrictTo('admin'),
  auctionController.cancelCurrentPlayer
);

module.exports = router;
