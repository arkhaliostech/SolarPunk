-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'viewer' CHECK(role IN ('founder', 'core_team', 'contributor', 'viewer')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);

-- Ideas table
CREATE TABLE IF NOT EXISTS ideas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'ideation' CHECK(status IN ('ideation', 'development', 'prototype', 'deployed')),
    progress INTEGER DEFAULT 0 CHECK(progress >= 0 AND progress <= 100),
    author_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id)
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
);

-- Idea tags junction table
CREATE TABLE IF NOT EXISTS idea_tags (
    idea_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (idea_id, tag_id),
    FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    idea_id INTEGER NOT NULL,
    user_id INTEGER,
    author_name TEXT NOT NULL,
    content TEXT NOT NULL,
    is_anonymous BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Likes table
CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    idea_id INTEGER NOT NULL,
    user_id INTEGER,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(idea_id, user_id),
    UNIQUE(idea_id, ip_address),
    FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Activity logs table (for AI context)
CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_type TEXT NOT NULL CHECK(activity_type IN ('user_registered', 'idea_created', 'idea_updated', 'comment_added', 'like_added', 'status_changed')),
    user_id INTEGER,
    idea_id INTEGER,
    comment_id INTEGER,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE SET NULL,
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE SET NULL
);

-- AI insights table (placeholder for future AI features)
CREATE TABLE IF NOT EXISTS ai_insights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    insight_type TEXT NOT NULL CHECK(insight_type IN ('summary', 'suggestion', 'analysis', 'trend')),
    idea_id INTEGER,
    content TEXT NOT NULL,
    confidence_score REAL,
    model_version TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE
);

-- Progress logs table
CREATE TABLE IF NOT EXISTS progress_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    idea_id INTEGER NOT NULL,
    old_progress INTEGER,
    new_progress INTEGER,
    notes TEXT,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ideas_status ON ideas(status);
CREATE INDEX IF NOT EXISTS idx_ideas_author ON ideas(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_idea ON comments(idea_id);
CREATE INDEX IF NOT EXISTS idx_likes_idea ON likes(idea_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON activity_logs(activity_type);

-- Insert default founder user (password: solarpunk123)
INSERT OR IGNORE INTO users (id, username, email, password_hash, role) VALUES 
(1, 'founder', 'founder@solarpunk.local', '$2a$10$xQZ0Q8wXvZ1QZ0Q8wXvZ1OqYZQ8wXvZ1QZ0Q8wXvZ1QZ0Q8wXvZ1Q', 'founder');

-- Insert sample ideas with founder as author
INSERT OR IGNORE INTO ideas (id, title, description, status, progress, author_id) VALUES
(1, 'Vertical Garden System', 'Modular vertical farming solution for urban apartments using hydroponics and IoT sensors for automated care', 'development', 0, 1),
(2, 'Solar Panel Tracker', 'AI-powered solar panel positioning system that maximizes energy capture throughout the day', 'prototype', 0, 1),
(3, 'Community Energy Grid', 'Decentralized energy sharing platform connecting solar panel owners with neighbors', 'ideation', 0, 1),
(4, 'Rainwater Harvesting System', 'Smart rainwater collection and purification system for residential use with mobile monitoring', 'development', 0, 1),
(5, 'Bike Lane Navigation App', 'Crowdsourced app showing safest bike routes with real-time updates on road conditions', 'deployed', 0, 1),
(6, 'Composting Tracker', 'Educational app that gamifies home composting and tracks carbon offset impact', 'prototype', 0, 1);

-- Insert sample tags
INSERT OR IGNORE INTO tags (name) VALUES 
('agriculture'), ('iot'), ('urban'), ('energy'), ('ai'), ('hardware'),
('blockchain'), ('community'), ('water'), ('sustainability'), ('transport'),
('mobile'), ('waste'), ('education');