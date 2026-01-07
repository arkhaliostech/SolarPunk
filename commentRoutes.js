const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { optionalAuth } = require('../middleware/auth');

// Routes that work with or without authentication
router.get('/ideas/:ideaId/comments', commentController.getComments);
router.post('/ideas/:ideaId/comments', optionalAuth, commentController.addComment);
router.post('/ideas/:ideaId/like', optionalAuth, commentController.toggleLike);

// Activity feed
router.get('/activity', commentController.getRecentActivity);

module.exports = router;