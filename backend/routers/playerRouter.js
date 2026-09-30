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
