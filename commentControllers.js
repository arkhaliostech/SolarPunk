const { getDatabase, runQuery, getQuery, allQuery } = require('../config/database');

// Get comments for an idea
async function getComments(req, res) {
    const { ideaId } = req.params;
    const db = getDatabase();

    try {
        const comments = await allQuery(
            db,
            `SELECT 
                c.*,
                u.username,
                CASE WHEN c.is_anonymous = 1 THEN 'Anonymous' ELSE c.author_name END as display_name
            FROM comments c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.idea_id = ?
            ORDER BY c.created_at DESC`,
            [ideaId]
        );

        res.json({ comments });

    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({ error: 'Failed to fetch comments' });
    } finally {
        db.close();
    }
}

// Add comment
async function addComment(req, res) {
    const { ideaId } = req.params;
    const { content, isAnonymous = false } = req.body;

    if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: 'Comment content is required' });
    }

    const db = getDatabase();

    try {
        // Check if idea exists
        const idea = await getQuery(db, 'SELECT id FROM ideas WHERE id = ?', [ideaId]);

        if (!idea) {
            return res.status(404).json({ error: 'Idea not found' });
        }

        let userId = null;
        let authorName = 'Anonymous';

        // If user is authenticated
        if (req.user) {
            userId = req.user.id;
            authorName = isAnonymous ? 'Anonymous' : req.user.username;
        }

        // Insert comment
        const result = await runQuery(
            db,
            'INSERT INTO comments (idea_id, user_id, author_name, content, is_anonymous) VALUES (?, ?, ?, ?, ?)',
            [ideaId, userId, authorName, content, isAnonymous ? 1 : 0]
        );

        // Log activity
        await runQuery(
            db,
            'INSERT INTO activity_logs (activity_type, user_id, idea_id, comment_id, metadata) VALUES (?, ?, ?, ?, ?)',
            ['comment_added', userId, ideaId, result.id, JSON.stringify({ isAnonymous })]
        );

        res.status(201).json({
            message: 'Comment added successfully',
            comment: {
                id: result.id,
                idea_id: ideaId,
                author_name: authorName,
                content,
                is_anonymous: isAnonymous,
                created_at: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ error: 'Failed to add comment' });
    } finally {
        db.close();
    }
}

// Add or remove like
async function toggleLike(req, res) {
    const { ideaId } = req.params;
    const db = getDatabase();

    try {
        // Check if idea exists
        const idea = await getQuery(db, 'SELECT id FROM ideas WHERE id = ?', [ideaId]);

        if (!idea) {
            return res.status(404).json({ error: 'Idea not found' });
        }

        let userId = null;
        let ipAddress = req.ip;

        if (req.user) {
            userId = req.user.id;
        }

        // Check if already liked
        let existingLike;
        if (userId) {
            existingLike = await getQuery(
                db,
                'SELECT id FROM likes WHERE idea_id = ? AND user_id = ?',
                [ideaId, userId]
            );
        } else {
            existingLike = await getQuery(
                db,
                'SELECT id FROM likes WHERE idea_id = ? AND ip_address = ?',
                [ideaId, ipAddress]
            );
        }

        if (existingLike) {
            // Unlike
            await runQuery(db, 'DELETE FROM likes WHERE id = ?', [existingLike.id]);
            
            const likeCount = await getQuery(
                db,
                'SELECT COUNT(*) as count FROM likes WHERE idea_id = ?',
                [ideaId]
            );

            return res.json({ 
                message: 'Like removed',
                liked: false,
                likeCount: likeCount.count
            });
        } else {
            // Like
            await runQuery(
                db,
                'INSERT INTO likes (idea_id, user_id, ip_address) VALUES (?, ?, ?)',
                [ideaId, userId, ipAddress]
            );

            // Log activity
            await runQuery(
                db,
                'INSERT INTO activity_logs (activity_type, user_id, idea_id) VALUES (?, ?, ?)',
                ['like_added', userId, ideaId]
            );

            const likeCount = await getQuery(
                db,
                'SELECT COUNT(*) as count FROM likes WHERE idea_id = ?',
                [ideaId]
            );

            return res.json({ 
                message: 'Like added',
                liked: true,
                likeCount: likeCount.count
            });
        }

    } catch (error) {
        console.error('Toggle like error:', error);
        res.status(500).json({ error: 'Failed to toggle like' });
    } finally {
        db.close();
    }
}

// Get recent activity
async function getRecentActivity(req, res) {
    const db = getDatabase();
    const limit = parseInt(req.query.limit) || 10;

    try {
        const activities = await allQuery(
            db,
            `SELECT 
                al.*,
                u.username,
                i.title as idea_title,
                c.content as comment_content
            FROM activity_logs al
            LEFT JOIN users u ON al.user_id = u.id
            LEFT JOIN ideas i ON al.idea_id = i.id
            LEFT JOIN comments c ON al.comment_id = c.id
            ORDER BY al.created_at DESC
            LIMIT ?`,
            [limit]
        );

        res.json({ activities });

    } catch (error) {
        console.error('Get activity error:', error);
        res.status(500).json({ error: 'Failed to fetch activity' });
    } finally {
        db.close();
    }
}

module.exports = {
    getComments,
    addComment,
    toggleLike,
    getRecentActivity
};