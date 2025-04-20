const WebSocket = require('ws');
const { Kafka } = require('kafkajs');
const { Pool } = require('pg');

const { redisClient } = require('./redis/redisClient');

const kafkaConsumer = new Kafka({ brokers: ['localhost:9092'] });
const consumer = kafkaConsumer.consumer({ groupId: 'tweet-consumers' });
const wss = new WebSocket.Server({ port: 8081 });

const pool = new Pool({
    user: 'trung',
    host: 'localhost',
    database: 'twitter_db',
    password: '123qwe',
    port: 5432,
});

const userSockets = new Map(); // userId => socket[]

wss.on('connection', (ws, req) => {
    const userId = new URLSearchParams(req.url.replace('/', '')).get('userId');
    if (!userSockets.has(userId)) {
        userSockets.set(userId, []);
    }
    userSockets.get(userId).push(ws);

    ws.on('close', () => {
        const list = userSockets.get(userId)?.filter(s => s !== ws);
        if (list.length === 0) {
            userSockets.delete(userId);
        } else {
            userSockets.set(userId, list);
        }
    });
});

async function startConsumer() {
    await consumer.connect();
    await consumer.subscribe({ topic: 'tweets', fromBeginning: true });

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            const tweet = JSON.parse(message.value.toString());
            console.log('Received tweet:', tweet);

            const followers = await getFollowers(tweet.author_id);
            followers.forEach(followerId => {
                const sockets = userSockets.get(String(followerId)) || [];
                sockets.forEach(ws => ws.send(JSON.stringify(tweet)));
            });
        }
    });
}

async function getFollowers(authorId) {
    const cacheKey = `followers:${authorId}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const res = await pool.query(
        'SELECT follower_id FROM follows WHERE followee_id = $1',
        [authorId]
    );
    const followerIds = res.rows.map(r => r.follower_id);

    await redisClient.set(cacheKey, JSON.stringify(followerIds), { EX: 60 });
    return followerIds;
}

startConsumer().catch(console.error);