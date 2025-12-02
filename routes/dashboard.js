// Dashboard Routes - Analytics and embedded Tableau dashboard
const express = require('express');
const router = express.Router();
const { db } = require('../server');

// Main dashboard
router.get('/', async (req, res) => {
  try {
    // Get key metrics
    const [participantCount] = await db('participants').count('* as count');
    const [eventCount] = await db('event_templates').count('* as count');
    const [surveyCount] = await db('surveys').count('* as count');
    const [milestoneCount] = await db('milestones').count('* as count');
    const [donationSum] = await db('donations').sum('donation_amount as total');

    // Get recent surveys with high satisfaction
    const recentSurveys = await db('surveys')
      .join('participants', 'surveys.participant_email', 'participants.participant_email')
      .select('surveys.*', 'participants.first_name', 'participants.last_name')
      .orderBy('surveys.survey_date', 'desc')
      .limit(10);

    // Get milestone achievement rates
    const milestoneStats = await db('milestones')
      .join('milestone_types', 'milestones.milestone_type_id', 'milestone_types.milestone_type_id')
      .select('milestone_types.category')
      .count('* as count')
      .groupBy('milestone_types.category');

    res.render('dashboard/index', {
      title: 'Dashboard',
      metrics: {
        participants: participantCount.count,
        events: eventCount.count,
        surveys: surveyCount.count,
        milestones: milestoneCount.count,
        totalDonations: donationSum.total || 0
      },
      recentSurveys,
      milestoneStats,
      tableauUrl: process.env.TABLEAU_DASHBOARD_URL || null,
      isManager: req.session.user.role === 'manager'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).render('error', { title: 'Error', message: 'Unable to load dashboard', error });
  }
});

module.exports = router;
