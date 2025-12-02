// Dashboard Routes - Analytics and embedded Tableau dashboard
const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Main dashboard
router.get('/', async (req, res) => {
  try {
    // Get key metrics
    const [participantCount] = await db('participants').count('* as count');
    const [eventCount] = await db('events').count('* as count');
    const [surveyCount] = await db('surveys').count('* as count');
    const [milestoneCount] = await db('milestones').count('* as count');
    const [donationSum] = await db('donations').sum('donation_amount as total');

    res.render('dashboard/index', {
      title: 'Dashboard',
      metrics: {
        participants: parseInt(participantCount.count) || 0,
        events: parseInt(eventCount.count) || 0,
        surveys: parseInt(surveyCount.count) || 0,
        milestones: parseInt(milestoneCount.count) || 0,
        totalDonations: parseFloat(donationSum.total) || 0
      },
      tableauUrl: process.env.TABLEAU_DASHBOARD_URL || null,
      isManager: req.session.user.role === 'manager' || req.session.user.role === 'admin'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).render('error', { title: 'Error', message: 'Unable to load dashboard', error });
  }
});

module.exports = router;
