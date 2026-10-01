const express = require('express');
const playerController = require('../controllers/playerController');
const authController = require('./../controllers/authController');

const router = express.Router();

router
  .route('/')
  .get(playerController.getAllPlayers)
  .post(
    authController.protect,
    authController.restrictTo('admin'),
    playerController.createPlayer
  );

router
  .route('/delete-all')
  .delete(
    authController.protect,
    authController.restrictTo('admin'),
    playerController.deleteAllPlayers
  );

router
  .route('/upload')
  .post(
    authController.protect,
    authController.restrictTo('admin'),
    playerController.uploadPlayers
  );

// Dynamic Google Forms / Sheets sync
router
  .route('/sync-google-sheet')
  .post(
    authController.protect,
    authController.restrictTo('admin'),
    playerController.syncGoogleSheet
  );

// Bulk unapproved management (MUST be before /:id)
router
  .route('/approve-all')
  .patch(
    authController.protect,
    authController.restrictTo('admin'),
    playerController.approveAllPlayers
  );

router
  .route('/unapproved')
  .delete(
    authController.protect,
    authController.restrictTo('admin'),
    playerController.rejectAllUnapprovedPlayers
  );

router
  .route('/:id/approve')
  .patch(
    authController.protect,
    authController.restrictTo('admin'),
    playerController.approvePlayer
  );

router
  .route('/:id')
  .get(playerController.getPlayer)
  .patch(
    authController.protect,
    authController.restrictTo('admin'),
    playerController.updatePlayer
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin'),
    playerController.deletePlayer
  );

module.exports = router;
