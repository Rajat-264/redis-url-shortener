require('dotenv').config();
const express = require('express');
const { createClient } = require('redis');
const shortid = require('shortid');

const app = express();
app.use(express.json());

let redisClients = [];

async function initRedisClients() {
  redisClients = await Promise.all(
    [1, 2, 3].map(async (i) => {
      const client = createClient({
        url: `redis://${process.env[`REDIS_HOST_${i}`]}:${process.env[`REDIS_PORT_${i}`]}`
      });
      
      client.on('error', err => console.error(`Redis ${i} error:`, err));
      await client.connect();
      return client;
    })
  );
}

function getRedisClient(key) {
  const hash = [...key].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return redisClients[hash % redisClients.length];
}

app.get('/health', async (_, res) => {
  const statuses = await Promise.all(
    redisClients.map(client => client.ping().then(() => 'OK').catch(() => 'DOWN'))
  );
  res.json({ redis: statuses });
});

app.post('/shorten', async (req, res) => {
  try {
    const { url, ttl } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const shortId = shortid.generate();
    const redisClient = getRedisClient(shortId);
    const validatedTtl = Math.min(Number(ttl) || 3600, 86400); 

    await redisClient.set(shortId, url, { EX: validatedTtl });
    res.json({ 
      shortUrl: `${req.protocol}://${req.get('host')}/${shortId}`,
      expiresIn: validatedTtl
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to shorten URL' });
  }
});

app.get('/:shortId', async (req, res) => {
  try {
    const { shortId } = req.params;
    const redisClient = getRedisClient(shortId);
    const url = await redisClient.get(shortId);

    if (!url) return res.status(404).send('URL not found or expired');
    res.redirect(url);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

initRedisClients().then(() => {
  app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
    console.log(`Redis clients connected: ${redisClients.filter(c => c.isOpen).length}/${redisClients.length}`);
  });
});