const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

router.get('/overview', protect, analyticsController.getUserOverview);
router.get('/top-tags', protect, analyticsController.getTopTags);
router.post('/track', analyticsController.trackEvent);

module.exports = router;
