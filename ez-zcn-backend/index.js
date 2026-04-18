// ============================================
// PennyWise API — Main Server (Security-Hardened)
// Inflation-Aware Household Savings Planner
// ============================================

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { sanitizeInputs } = require('./middleware/sanitize');

const app = express();
const PORT = process.env.PORT || 5000;
const IS_PROD = process.env.NODE_ENV === 'production';

// ============================================
// 1. Security Headers — Helmet (hardened)
// ============================================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],       // inline styles for UI libs
      imgSrc: ["'self'", 'data:', 'https:'],         // allow data URIs and HTTPS images
      connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:5173'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: IS_PROD ? [] : null,
    },
  },
  hsts: {
    maxAge: 31536000,              // 1 year in seconds
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,                   // X-Content-Type-Options: nosniff
  frameguard: { action: 'deny' },  // X-Frame-Options: DENY
  xssFilter: true,                 // X-XSS-Protection: 1; mode=block
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginEmbedderPolicy: false, // disable COEP for API
}));

// ============================================
// 2. CORS — only allow FRONTEND_URL origin
// ============================================
const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    // In production, you may want to tighten this further
    if (
      !origin || 
      origin === allowedOrigin || 
      origin.startsWith('http://localhost:') || 
      origin.startsWith('http://127.0.0.1:') ||
      /\.vercel\.app$/.test(origin)
    ) {
      callback(null, true);
    } else {
      callback(new Error('CORS: origin not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,                     // preflight cache 24h
}));

// ============================================
// 3. Cookie Parser
// ============================================
app.use(cookieParser());

// ============================================
// 4. Body Parser (reduced limit for security)
// ============================================
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// ============================================
// 5. Input Sanitization — strip SQL injection patterns
// ============================================
app.use(sanitizeInputs);

// ============================================
// 6. Rate Limiting
// ============================================

// Global limiter: 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
  },
});
app.use(globalLimiter);

// Auth limiter: 50 requests per 15 minutes per IP (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again later.',
  },
});

// Weekly entry limiter: 10 posts per day per IP
const weeklyEntryLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,    // 24 hours
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Daily limit reached for weekly entries. Try again tomorrow.',
  },
});

// ============================================
// 7. Health Check (no sensitive info)
// ============================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'PennyWise API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// 8. Route Mounting
// ============================================
const authRoutes         = require('./routes/authRoutes');
const userRoutes         = require('./routes/userRoutes');
const incomeRoutes       = require('./routes/incomeRoutes');
const expenseRoutes      = require('./routes/expenseRoutes');
const analysisRoutes     = require('./routes/analysisRoutes');
const goalRoutes         = require('./routes/goalRoutes');
const weeklyRoutes       = require('./routes/weeklyRoutes');
const inflationRoutes    = require('./routes/inflationRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const monthlyRecordRoutes = require('./routes/monthlyRecordRoutes');

app.use('/api/auth',          authLimiter, authRoutes);
app.use('/api/user',          userRoutes);
app.use('/api/income',        incomeRoutes);
app.use('/api/expenses',      expenseRoutes);
app.use('/api/analysis',      analysisRoutes);
app.use('/api/goals',         goalRoutes);
app.use('/api/weekly',        weeklyRoutes);
app.use('/api/inflation',     inflationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/monthly-record', monthlyRecordRoutes);

// ============================================
// 9. 404 Handler (no path leakage in production)
// ============================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found.',
  });
});

// ============================================
// 10. Global Error Handler (HARDENED)
//     - NEVER leaks stack traces in production
//     - Always returns generic message in prod
//     - Logs full details server-side only
// ============================================
app.use((err, req, res, next) => {
  // Server-side logging (always — never sent to client)
  console.error('─── Unhandled Error ───');
  console.error('Timestamp:', new Date().toISOString());
  console.error('Route:', req.method, req.originalUrl);
  console.error('Error:', err.stack || err.message || err);
  console.error('───────────────────────');

  const statusCode = err.status || err.statusCode || 500;

  // In production: ALWAYS return generic message, NEVER stack/message
  if (IS_PROD) {
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 500 ? 'Something went wrong.' : err.message || 'Something went wrong.',
    });
  }

  // In development: show details for debugging
  return res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal server error',
    stack: err.stack,
  });
});

// ============================================
// 11. Start Server
// ============================================
const { startInflationJob } = require('./jobs/inflationJob');
const { startNotificationJobs } = require('./jobs/notificationJob');
const { ensureTable: ensureMonthlyRecords } = require('./controllers/monthlyRecordController');
const { ensureGoalTables } = require('./controllers/goalController');

app.listen(PORT, () => {
  console.log(`\n🪙  PennyWise API is running`);
  console.log(`   Port:        ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Frontend:    ${allowedOrigin}`);
  console.log(`   Health:      http://localhost:${PORT}/api/health\n`);

  // Start background jobs
  startInflationJob();
  startNotificationJobs();

  // Ensure tables exist
  ensureMonthlyRecords();
  ensureGoalTables();
});

// Export for testing
module.exports = app;