// Required modules
const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const { sendTweet } = require('./kafka-producers/producer-tweet');

const { redisClient } = require("./redis/redisClient")

// App setup
const app = express();
const port = 3000;
const JWT_SECRET = 'your_jwt_secret';

app.use(cors());
app.use(bodyParser.json());

// PostgreSQL connection
const pool = new Pool({
    user: 'trung',
    host: 'localhost',
    database: 'twitter_db',
    password: '123qwe',
    port: 5432,
});

// Middleware to protect routes
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// Auth: Register
app.post('/auth/register', async (req, res) => {
    const { username, email, password } = req.body;
    const password_hash = await bcrypt.hash(password, 10);
    try {
        const result = await pool.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING *',
            [username, email, password_hash]
        );
        res.status(201).json({ user: result.rows[0] });
    } catch (err) {
        console.log(err)
        res.status(400).json({ error: 'User already exists or invalid input' });
    }
});

// Auth: Login
app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
});

// Get all users
app.get('/users', async (req, res) => {
    const result = await pool.query('SELECT * FROM users ORDER BY id');
    res.json(result.rows);
});

// Follow a user (protected)
app.post('/follow', authenticateToken, async (req, res) => {
    try {
        await pool.query(
            'INSERT INTO follows (follower_id, followee_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [follower_id, followee_id]
        );
        await redisClient.del(`followers:${followee_id}`);
        res.sendStatus(201);
    } catch (err) {
        console.error('Failed to follow user:', err);
        res.status(500).json({ error: 'Follow failed' });
    }
});

// Unfollow a user (protected)
app.post('/unfollow', authenticateToken, async (req, res) => {
    const { follower_id, followee_id } = req.body;
    try {
        await pool.query(
            'DELETE FROM follows WHERE follower_id = $1 AND followee_id = $2',
            [follower_id, followee_id]
        );
        await redisClient.del(`followers:${followee_id}`);
        res.sendStatus(200);
    } catch (err) {
        console.error('Failed to unfollow user:', err);
        res.status(500).json({ error: 'Unfollow failed' });
    }
});

// Like a user's tweet
app.post('/like', authenticateToken, async (req, res) => {
    const { tweet_id } = req.body;
    const user_id = req.user.id;

    try {
        await pool.query(
            'INSERT INTO likes (user_id, tweet_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [user_id, tweet_id]
        );
        res.status(200).json({ message: 'Liked!' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to like tweet' });
    }
});

// Replies table should exist in DB
app.post('/reply', authenticateToken, async (req, res) => {
    const { tweet_id, content } = req.body;
    const user_id = req.user.id;

    try {
        await pool.query(
            'INSERT INTO replies (user_id, tweet_id, content) VALUES ($1, $2, $3)',
            [user_id, tweet_id, content]
        );
        res.status(201).json({ message: 'Replied!' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to reply to tweet' });
    }
});


//// TWEETS APIS
app.get('/tweets/feed/:userId', authenticateToken, async (req, res) => {
    const { userId } = req.params;
    console.log('[userId]', userId)

    try {
        const result = await pool.query(
            `
            SELECT t.*, u.username
            FROM tweets t
            JOIN users u ON t.user_id = u.id
            WHERE t.user_id = $1
            OR t.user_id IN (
                SELECT followee_id
                FROM follows
                WHERE follower_id = $1
            )
            ORDER BY t.created_at DESC
        `,
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error loading feed:', err);
        res.status(500).json({ error: 'Failed to load feed' });
    }
});

// Get all tweets for a user (timeline-style)
app.get('/timeline/:user_id', async (req, res) => {
    const userId = req.params.user_id;
    const result = await pool.query(
        `SELECT t.* FROM tweets t
     JOIN follows f ON f.followee_id = t.user_id
     WHERE f.follower_id = $1
     ORDER BY t.created_at DESC LIMIT 20`,
        [userId]
    );
    res.json(result.rows);
});

// Create new tweet (protected)
app.post('/tweets', authenticateToken, async (req, res) => {
    try {
        // save to db
        const { content } = req.body;
        const user_id = req.user.id;
        const result = await pool.query(
            'INSERT INTO tweets (user_id, content) VALUES ($1, $2) RETURNING *',
            [user_id, content]
        );
        const insertedTweet = result.rows[0];

        await redisClient.set('tweet:' + insertedTweet.id, JSON.stringify(insertedTweet), { EX: 60 });

        // add message to "tweets" topics kafka
        await sendTweet({
            id: insertedTweet.id,
            content: content,
            author_id: user_id,
            created_at: insertedTweet.created_at
        });

        res.status(201).json(insertedTweet);
    } catch (error) {
        console.error('Failed to post tweet:', err);
        res.status(500).json({ error: 'Failed to post tweet' });
    }
});

// Start server
app.listen(port, () => {
    console.log(`🚀 Server listening at http://localhost:${port}`);
});