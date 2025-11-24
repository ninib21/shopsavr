const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referralController');
const authMiddleware = require('../middleware/auth');

// All referral routes require authentication
router.use(authMiddleware);

router.get('/', referralController.getReferralCode);
router.post('/apply', referralController.processReferralSignup);
router.get('/stats', referralController.getReferralStats);

module.exports = router;