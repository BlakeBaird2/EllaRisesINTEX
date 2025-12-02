// ========================================================================
// Ella Rises INTEX - Main Server File
// ========================================================================
// if this line shows up, ethan can edit the code

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./config/database');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ========================================================================
// Middleware Configuration
// ========================================================================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Body parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'ella-rises-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));

// Make user session available to all views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.isManager = req.session.user?.role === 'manager';
  res.locals.isLoggedIn = !!req.session.user;
  next();
});

// ========================================================================
// Authentication Middleware
// ========================================================================
const requireLogin = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login?error=Please login to access this page');
  }
  next();
};

const requireManager = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login?error=Please login to access this page');
  }
  if (req.session.user.role !== 'manager' && req.session.user.role !== 'admin') {
    return res.status(403).render('error', {
      title: 'Access Denied',
      message: 'You do not have permission to access this page. Manager or admin access required.',
      error: { status: 403 }
    });
  }
  next();
};

// ========================================================================
// Import Routes
// ========================================================================
const authRoutes = require('./routes/auth');
const publicRoutes = require('./routes/public');
const participantRoutes = require('./routes/participants');
const eventRoutes = require('./routes/events');
const surveyRoutes = require('./routes/surveys');
const milestoneRoutes = require('./routes/milestones');
const donationRoutes = require('./routes/donations');
const userRoutes = require('./routes/users');
const dashboardRoutes = require('./routes/dashboard');

// ========================================================================
// Route Mounting
// ========================================================================
// Public routes (no auth required)
app.use('/', publicRoutes);
app.use('/auth', authRoutes);

// Protected routes (require login)
app.use('/participants', requireLogin, participantRoutes);
app.use('/events', requireLogin, eventRoutes);
app.use('/surveys', requireLogin, surveyRoutes);
app.use('/milestones', requireLogin, milestoneRoutes);
app.use('/donations', requireLogin, donationRoutes);

// Manager-only routes
app.use('/dashboard', requireManager, dashboardRoutes);
app.use('/users', requireManager, userRoutes);

// ========================================================================
// HTTP 418 Status Code Route (Project Requirement)
// ========================================================================
app.get('/teapot', (req, res) => {
  res.status(418).render('teapot', {
    title: 'I\'m a Teapot'
  });
});

// ========================================================================
// Error Handling
// ========================================================================
// 404 handler
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Page Not Found',
    message: 'The page you are looking for does not exist.',
    error: { status: 404 }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).render('error', {
    title: 'Error',
    message: err.message || 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err : { status: err.status }
  });
});

// ========================================================================
// Server Start
// ========================================================================
app.listen(PORT, () => {
  console.log(`✅ Ella Rises server running on port ${PORT}`);
  console.log(`🌐 Visit: http://localhost:${PORT}`);
});

// Export for routes and testing
module.exports = { app, db, requireLogin, requireManager };
