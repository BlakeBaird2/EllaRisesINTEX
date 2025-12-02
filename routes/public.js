// ========================================================================
// Public Routes
// Accessible to all visitors (no authentication required)
// ========================================================================

const express = require('express');
const router = express.Router();
const db = require('../config/database');

// ========================================================================
// GET / - Landing Page
// ========================================================================
router.get('/', (req, res) => {
  res.render('public/landing', {
    title: 'Ella Rises - Empowering Women in STEAM'
  });
});

// ========================================================================
// GET /about - About Page
// ========================================================================
router.get('/about', (req, res) => {
  res.render('public/about', {
    title: 'About Ella Rises'
  });
});

// ========================================================================
// GET /donate - Donation Page
// ========================================================================
router.get('/donate', (req, res) => {
  res.render('public/donate', {
    title: 'Support Ella Rises',
    success: req.query.success || null,
    error: req.query.error || null
  });
});

// ========================================================================
// POST /donate - Process Donation
// ========================================================================
router.post('/donate', async (req, res) => {
  const {
    donor_name,
    donor_email,
    donor_phone,
    amount,
    donation_type,
    participant_email
  } = req.body;

  try {
    // Validate required fields
    if (!donor_name || !donor_email || !amount) {
      return res.redirect('/donate?error=Please fill in all required fields');
    }

    // Insert donation
    await db('donations').insert({
      participant_email: participant_email || null,
      donation_amount: parseFloat(amount),
      donation_date: new Date(),
      donor_name,
      donor_email,
      donor_phone: donor_phone || null,
      donation_type: donation_type || 'general'
    });

    res.redirect('/donate?success=Thank you for your generous donation!');

  } catch (error) {
    console.error('Donation error:', error);
    res.redirect('/donate?error=An error occurred. Please try again.');
  }
});

// ========================================================================
// GET /login redirect
// ========================================================================
router.get('/login', (req, res) => {
  res.redirect('/auth/login');
});

module.exports = router;
