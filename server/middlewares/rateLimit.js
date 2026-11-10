const { createHmac } = require('node:crypto');
const { createClient } = require('redis');

let client;
let connecting;
const increment = `
  local count = redis.call('INCR', KEYS[1])
  if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
  return {count, redis.call('PTTL', KEYS[1])}
`;

async function sharedCounter(key, windowMs) {
  if (!client?.isOpen) {
    client = createClient({
      url: process.env.REDIS_URL,
      disableOfflineQueue: true,
      socket: { connectTimeout: 2500, reconnectStrategy: false },
    });
    client.on('error', () => console.error('Rate limit Redis connection failed'));
    connecting = client.connect().finally(() => { connecting = undefined; });
  }
  if (connecting) await connecting;
  return client.withAbortSignal(AbortSignal.timeout(2500)).eval(increment, {
    keys: [key],
    arguments: [String(windowMs)],
  });
}

function emailKey(req) {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  return email.length <= 254 ? email : '';
}
const accountKey = req => req.account?.id;

function rateLimit({ limit = 20, windowMs = 15 * 60000, key = req => req.ip, bucket } = {}) {
  const entries = new Map();
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [id, entry] of entries) if (entry.reset <= now) entries.delete(id);
  }, 60000);
  timer.unref();

  return async (req, res, next) => {
    const value = key(req);
    if (!value) return next();
    const digest = createHmac('sha256', process.env.JWT_SECRET || 'local-rate-limit').update(String(value)).digest('hex');
    const id = `hospiq:limit:${bucket || `${req.method}:${req.baseUrl}:${req.route?.path || ''}`}:${digest}`;
    let count, remaining;
    if (process.env.REDIS_URL || process.env.NODE_ENV === 'production') {
      try {
        if (!process.env.REDIS_URL) throw new Error('Missing REDIS_URL');
        [count, remaining] = await sharedCounter(id, windowMs);
      } catch {
        return res.status(503).json({ message: 'Request protection temporarily unavailable. Please try again.' });
      }
    } else {
      const now = Date.now();
      let entry = entries.get(id);
      if (!entry || entry.reset <= now) {
        entry = { count: 0, reset: now + windowMs };
        entries.set(id, entry);
      }
      count = ++entry.count;
      remaining = entry.reset - now;
    }
    if (count > limit) {
      res.set('Retry-After', String(Math.max(1, Math.ceil(remaining / 1000))));
      return res.status(429).json({ message: 'Too many attempts. Please try again later.' });
    }
    next();
  };
}

function close() {
  if (client?.isOpen) client.destroy();
}

module.exports = Object.assign(rateLimit, { emailKey, accountKey, close });
