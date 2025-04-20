const redis = require('redis');

const redisClient = redis.createClient();
redisClient.connect().catch(console.error);

module.exports = { redisClient };