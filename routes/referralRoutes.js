const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referralController');
const { protect } = require('../middleware/auth');
const { referralInviteRateLimiter } = require('../middleware/rateLimiter');

router.post(
  '/invite',
  protect,
  referralInviteRateLimiter,
  referralController.sendInvites
);

module.exports = router;
