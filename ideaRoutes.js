const express = require('express');
const router = express.Router();
const ideaController = require('../controllers/ideaController');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

// Public routes
router.get('/', ideaController.getAllIdeas);
router.get('/tags', ideaController.getAllTags);
router.get('/:id', ideaController.getIdeaById);

// Admin only routes
router.post('/', authenticateToken, requireAdmin, ideaController.createIdea);
router.patch('/:id/progress', authenticateToken, requireAdmin, ideaController.updateProgress);

module.exports = router;