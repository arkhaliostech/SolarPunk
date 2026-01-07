const { getDatabase, runQuery, getQuery, allQuery } = require('../config/database');

// Get all ideas with counts
async function getAllIdeas(req, res) {
    const db = getDatabase();
    const { status, tag } = req.query;

    try {
        let query = `
            SELECT 
                i.*,
                u.username as author_name,
                (SELECT COUNT(*) FROM comments WHERE idea_id = i.id) as comment_count,
                (SELECT COUNT(*) FROM likes WHERE idea_id = i.id) as like_count,
                GROUP_CONCAT(t.name) as tags
            FROM ideas i
            LEFT JOIN users u ON i.author_id = u.id
            LEFT JOIN idea_tags it ON i.id = it.idea_id
            LEFT JOIN tags t ON it.tag_id = t.id
        `;

        const params = [];

        if (status) {
            query += ' WHERE i.status = ?';
            params.push(status);
        }

        query += ' GROUP BY i.id ORDER BY i.updated_at DESC';

        let ideas = await allQuery(db, query, params);

        // Parse tags
        ideas = ideas.map(idea => ({
            ...idea,
            tags: idea.tags ? idea.tags.split(',') : []
        }));

        // Filter by tag if specified
        if (tag) {
            ideas = ideas.filter(idea => idea.tags.includes(tag));
        }

        res.json({ ideas });

    } catch (error) {
        console.error('Get ideas error:', error);
        res.status(500).json({ error: 'Failed to fetch ideas' });
    } finally {
        db.close();
    }
}

// Get single idea by ID
async function getIdeaById(req, res) {
    const { id } = req.params;
    const db = getDatabase();

    try {
        const idea = await getQuery(
            db,
            `SELECT 
                i.*,
                u.username as author_name,
                (SELECT COUNT(*) FROM comments WHERE idea_id = i.id) as comment_count,
                (SELECT COUNT(*) FROM likes WHERE idea_id = i.id) as like_count
            FROM ideas i
            LEFT JOIN users u ON i.author_id = u.id
            WHERE i.id = ?`,
            [id]
        );

        if (!idea) {
            return res.status(404).json({ error: 'Idea not found' });
        }

        // Get tags
        const tags = await allQuery(
            db,
            `SELECT t.name FROM tags t
            INNER JOIN idea_tags it ON t.id = it.tag_id
            WHERE it.idea_id = ?`,
            [id]
        );

        idea.tags = tags.map(t => t.name);

        res.json({ idea });

    } catch (error) {
        console.error('Get idea error:', error);
        res.status(500).json({ error: 'Failed to fetch idea' });
    } finally {
        db.close();
    }
}

// Create new idea (admin only)
async function createIdea(req, res) {
    const { title, description, status = 'ideation', tags = [] } = req.body;
    const authorId = req.user.id;

    if (!title || !description) {
        return res.status(400).json({ error: 'Title and description are required' });
    }

    const db = getDatabase();

    try {
        // Insert idea
        const result = await runQuery(
            db,
            'INSERT INTO ideas (title, description, status, author_id) VALUES (?, ?, ?, ?)',
            [title, description, status, authorId]
        );

        const ideaId = result.id;

        // Insert tags
        for (const tagName of tags) {
            // Get or create tag
            let tag = await getQuery(db, 'SELECT id FROM tags WHERE name = ?', [tagName]);
            
            if (!tag) {
                const tagResult = await runQuery(db, 'INSERT INTO tags (name) VALUES (?)', [tagName]);
                tag = { id: tagResult.id };
            }

            // Link tag to idea
            await runQuery(
                db,
                'INSERT INTO idea_tags (idea_id, tag_id) VALUES (?, ?)',
                [ideaId, tag.id]
            );
        }

        // Log activity
        await runQuery(
            db,
            'INSERT INTO activity_logs (activity_type, user_id, idea_id, metadata) VALUES (?, ?, ?, ?)',
            ['idea_created', authorId, ideaId, JSON.stringify({ title })]
        );

        res.status(201).json({
            message: 'Idea created successfully',
            idea: { id: ideaId, title, description, status, tags }
        });

    } catch (error) {
        console.error('Create idea error:', error);
        res.status(500).json({ error: 'Failed to create idea' });
    } finally {
        db.close();
    }
}

// Update idea progress (admin only)
async function updateProgress(req, res) {
    const { id } = req.params;
    const { progress, notes } = req.body;

    if (progress < 0 || progress > 100) {
        return res.status(400).json({ error: 'Progress must be between 0 and 100' });
    }

    const db = getDatabase();

    try {
        const idea = await getQuery(db, 'SELECT progress FROM ideas WHERE id = ?', [id]);

        if (!idea) {
            return res.status(404).json({ error: 'Idea not found' });
        }

        // Update progress
        await runQuery(
            db,
            'UPDATE ideas SET progress = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [progress, id]
        );

        // Log progress change
        await runQuery(
            db,
            'INSERT INTO progress_logs (idea_id, old_progress, new_progress, notes, user_id) VALUES (?, ?, ?, ?, ?)',
            [id, idea.progress, progress, notes, req.user.id]
        );

        // Log activity
        await runQuery(
            db,
            'INSERT INTO activity_logs (activity_type, user_id, idea_id, metadata) VALUES (?, ?, ?, ?)',
            ['idea_updated', req.user.id, id, JSON.stringify({ progress, oldProgress: idea.progress })]
        );

        res.json({ message: 'Progress updated', progress });

    } catch (error) {
        console.error('Update progress error:', error);
        res.status(500).json({ error: 'Failed to update progress' });
    } finally {
        db.close();
    }
}

// Get all tags
async function getAllTags(req, res) {
    const db = getDatabase();

    try {
        const tags = await allQuery(db, 'SELECT name FROM tags ORDER BY name');
        res.json({ tags: tags.map(t => t.name) });

    } catch (error) {
        console.error('Get tags error:', error);
        res.status(500).json({ error: 'Failed to fetch tags' });
    } finally {
        db.close();
    }
}

module.exports = {
    getAllIdeas,
    getIdeaById,
    createIdea,
    updateProgress,
    getAllTags
};