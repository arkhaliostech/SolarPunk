require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { initDatabase } = require('./config/database');

// Import routes
const authRoutes = require('./routes/authRoutes');
const ideaRoutes = require('./routes/ideaRoutes');
const commentRoutes = require('./routes/commentRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('../frontend'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/ideas', ideaRoutes);
app.use('/api', commentRoutes);
app.use('/api/ai', aiRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Initialize database and start server
async function startServer() {
    try {
        await initDatabase();
        
        app.listen(PORT, () => {
            console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🌱 Solarpunk Innovation Platform                          ║
║                                                              ║
║   Server running on: http://localhost:${PORT}                    ║
║   Frontend: http://localhost:${PORT}                             ║
║   API: http://localhost:${PORT}/api                              ║
║                                                              ║
║   Status: Ready                                              ║
║   Database: Connected                                        ║
║   AI Features: Disabled (see aiService.js)                   ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
            `);
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();