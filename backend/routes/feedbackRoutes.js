const express = require('express');
const { submitFeedback, getAllFeedback, getFeedbackMetrics, deleteFeedback } = require('../controllers/feedbackController');
const { ensureAdminAuthenticated } = require('../middleware/adminAuthMiddleware');
const router = express.Router();

// Route for submitting feedback
router.post('/feedback', submitFeedback);

// Route for getting all feedback (admin only, if applicable)
router.get('/feedback', getAllFeedback);

// Route for getting feedback metrics (admin only, if applicable)
router.get('/feedback/metrics', getFeedbackMetrics);

// Route for deleting feedback (admin only)
router.delete('/feedback/:id', ensureAdminAuthenticated, deleteFeedback);

module.exports = router;