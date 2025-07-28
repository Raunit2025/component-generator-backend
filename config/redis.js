// config/redis.js
const { createClient } = require('redis');

let redisClient = null;

// Only initialize Redis if the URL is provided in the environment variables
if (process.env.REDIS_URL) {
  console.log('REDIS_URL found, initializing Redis client...');
  
  redisClient = createClient({
    url: process.env.REDIS_URL
  });

  redisClient.on('error', (err) => console.log('Redis Client Error', err));

  // Connect to Redis
  redisClient.connect();
} else {
  console.log('REDIS_URL not found, Redis caching is disabled.');
}

module.exports = redisClient;
