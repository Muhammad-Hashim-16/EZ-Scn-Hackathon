// ============================================
// PennyWise API — Main Server
// Inflation-Aware Household Savings Planner
// ============================================

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// 1. Security Headers
// ============================================
app.use(helmet());

// ============================================
// 2. CORS — only allow requests from FRONTEND_URL
// ============================================
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,                                  // allow httpOnly cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ============================================
// 3. Cookie Parser — for reading httpOnly refresh tokens
// ============================================
app.use(cookieParser());

// ============================================
// 4. Body Parser
// ============================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ============================================
// 5. Rate Limiting
// ============================================

// Global limiter: 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,       // 15 minutes
  max: 100,                        // 100 requests per window
  standardHeaders: true,           // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,            // Disable `X-RateLimit-*` headers
  message: {
    status: 429,
    error: 'Too many requests. Please try again after 15 minutes.',
  },
});
app.use(globalLimiter);

// Auth limiter: 5 requests per 15 minutes per IP (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,       // 15 minutes
  max: 5,                          // 5 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});

// ============================================
// 6. Health Check
// ============================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'PennyWise API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ============================================
// 7. Route Mounting
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

app.use('/api/auth',          authLimiter, authRoutes);     // stricter rate limit
app.use('/api/user',          userRoutes);
app.use('/api/income',        incomeRoutes);
app.use('/api/expenses',      expenseRoutes);
app.use('/api/analysis',      analysisRoutes);
app.use('/api/goals',         goalRoutes);
app.use('/api/weekly',        weeklyRoutes);
app.use('/api/inflation',     inflationRoutes);
app.use('/api/notifications', notificationRoutes);

// ============================================
// 8. 404 Handler
// ============================================
app.use((req, res) => {
  res.status(404).json({
    status: 404,
    error: 'Route not found',
    path: req.originalUrl,
  });
});

// ============================================
// 9. Global Error Handler
// ============================================
app.use((err, req, res, next) => {
  console.error('─── Unhandled Error ───');
  console.error('Timestamp:', new Date().toISOString());
  console.error('Route:', req.method, req.originalUrl);
  console.error('Error:', err.stack || err.message || err);
  console.error('───────────────────────');

  // Don't leak error details in production
  const isDev = process.env.NODE_ENV !== 'production';

  res.status(err.status || 500).json({
    status: err.status || 500,
    error: isDev ? err.message : 'Internal server error',
    ...(isDev && { stack: err.stack }),
  });
});

// ============================================
// 10. Start Server
// ============================================
app.listen(PORT, () => {
  console.log(`\n🪙  PennyWise API is running`);
  console.log(`   Port:        ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Frontend:    ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`   Health:      http://localhost:${PORT}/api/health\n`);
});

module.exports = app;