const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const playerRouter = require('./routers/playerRouter');
const teamRouter = require('./routers/teamRouter');
const globalErrorHandler = require('./controllers/errorController');
const userRouter = require('./routers/userRouter');
const auctionRouter = require('./routers/auctionRoutes');
const cors = require('cors');
const app = express();
// http security header ...

// Placeholder for Socket.IO instance; server.js will set this after creation
app.set('io', null);

// Attach io instance to each request early so routers/controllers can emit events
app.use((req, res, next) => {
  const io = req.app.get('io');
  if (io) req.io = io;
  next();
});

// CORS: allow production domains, GitHub Pages, and origins specified via environment variable
const envOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : [];

const productionOrigins = [
  'https://dgplauction.online',
  'https://www.dgplauction.online',
  'https://dgpl-auction.tech',
  'https://www.dgpl-auction.tech',
  'https://api.dgpl-auction.tech',
  'https://dgpl-auction-dmajgf0e7-vvc723s-projects.vercel.app',
  ...envOrigins,
];
// Include common localhost ports plus explicit LAN development host (mobile testing)
const devOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://192.168.137.1:5173',
];
const allowedOrigins =
  process.env.NODE_ENV === 'production'
    ? productionOrigins
    : productionOrigins.concat(devOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow non-browser requests (no origin), configured allowed origins, or GitHub Pages subdomains
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        (origin && origin.endsWith('.github.io'))
      ) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS')); // will be handled by global error handler
    },
    credentials: true,
  })
); // this will accept requests from cross orgins ..
app.use(helmet());

//body parser also limits the data to 10 kb ...
app.use(express.json({ limit: '5mb' }));

// Basic mongo operator injection sanitizer (avoid express-mongo-sanitize reassign bug with Express 5)
app.use((req, res, next) => {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    for (const key of Object.keys(obj)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key];
      } else {
        const val = obj[key];
        if (typeof val === 'object') sanitize(val);
      }
    }
  };
  sanitize(req.body);
  sanitize(req.query); // mutate in place without reassigning req.query
  sanitize(req.params);
  next();
});
// xss-clean reassigns req.query (breaks under Express 5 getter); implement lightweight in-place XSS sanitization instead
app.use((req, res, next) => {
  const stripTags = (val) =>
    typeof val === 'string' ? val.replace(/<[^>]*>/g, '') : val;
  if (req.query) {
    for (const k in req.query) req.query[k] = stripTags(req.query[k]);
  }
  if (req.body && typeof req.body === 'object') {
    for (const k in req.body) req.body[k] = stripTags(req.body[k]);
  }
  next();
});

// to limit the number of rest api calls an ip can make
const limiter = rateLimit({
  max: 500,
  windowMs: 5 * 60 * 1000,
  message: 'your requests crossed the limits please come back in 1 hour',
});
app.use('/api', limiter);

app.use('/api/v1/players', playerRouter);
app.use('/api/v1/teams', teamRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/auction', auctionRouter);

// Root endpoint for simple status check
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'DGPL Auction API Server is running',
  });
});

// Simple health endpoint for origin/proxy checks
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});
// Handle undefined routes
const AppError = require('./utils/appError');
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});
app.use(globalErrorHandler);
module.exports = app;
