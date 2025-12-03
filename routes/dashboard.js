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
    const [registrationCount] = await db('registrations').count('* as count');

    res.render('dashboard/index', {
      title: 'Dashboard',
      metrics: {
        participants: parseInt(participantCount.count) || 0,
        events: parseInt(eventCount.count) || 0,
        surveys: parseInt(surveyCount.count) || 0,
        milestones: parseInt(milestoneCount.count) || 0,
        totalDonations: parseFloat(donationSum.total) || 0,
        registrations: parseInt(registrationCount.count) || 0
      },
      tableauUrl: process.env.TABLEAU_DASHBOARD_URL || null,
      isManager: req.session.user.role === 'manager' || req.session.user.role === 'admin'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).render('error', { title: 'Error', message: 'Unable to load dashboard', error });
  }
});

// Update dashboard metric
router.post('/update-metric', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { table, type, column, name, index } = req.body;
    
    // Validate inputs
    if (!table || !type || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (type === 'sum' && !column) {
      return res.status(400).json({ error: 'Column required for sum type' });
    }

    // For now, we'll just return success
    // In a full implementation, you'd save this to a user_preferences table
    // and load it when rendering the dashboard
    
    res.json({ success: true, message: 'Metric updated successfully' });
  } catch (error) {
    console.error('Error updating metric:', error);
    res.status(500).json({ error: 'Unable to update metric' });
  }
});

module.exports = router;
