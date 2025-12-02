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

    // Get all participants data
    const participants = await db('participants')
      .select('*')
      .orderBy('participant_last_name', 'asc')
      .limit(50);

    // Get all events data
    const events = await db('events')
      .select('*')
      .orderBy('event_name', 'asc')
      .limit(50);

    // Get all donations data with participant names
    const donations = await db('donations')
      .leftJoin('participants', 'donations.participant_id', 'participants.participant_id')
      .select('donations.*',
              'participants.participant_first_name as first_name',
              'participants.participant_last_name as last_name')
      .orderBy('donations.donation_date', 'desc')
      .limit(50);

    // Get all surveys data with participant names
    const surveys = await db('surveys')
      .leftJoin('registrations', 'surveys.registration_id', 'registrations.registration_id')
      .leftJoin('participants', 'registrations.participant_id', 'participants.participant_id')
      .leftJoin('eventoccurrences', 'registrations.event_occurrence_id', 'eventoccurrences.event_occurrence_id')
      .leftJoin('events', 'eventoccurrences.event_template_id', 'events.event_template_id')
      .select('surveys.*',
              'participants.participant_first_name as first_name',
              'participants.participant_last_name as last_name',
              'events.event_name')
      .orderBy('surveys.survey_submission_date', 'desc')
      .limit(50);

    // Get all milestones data with participant and milestone type info
    const milestones = await db('milestones')
      .join('participants', 'milestones.participant_id', 'participants.participant_id')
      .join('milestonetypes', 'milestones.milestone_type_id', 'milestonetypes.milestone_type_id')
      .select('milestones.*',
              'participants.participant_first_name as first_name',
              'participants.participant_last_name as last_name',
              'milestonetypes.milestone_title')
      .orderBy('milestones.milestone_date', 'desc')
      .limit(50);

    res.render('dashboard/index', {
      title: 'Dashboard',
      metrics: {
        participants: participantCount.count,
        events: eventCount.count,
        surveys: surveyCount.count,
        milestones: milestoneCount.count,
        totalDonations: donationSum.total || 0
      },
      participants,
      events,
      donations,
      surveys,
      milestones,
      tableauUrl: process.env.TABLEAU_DASHBOARD_URL || null,
      isManager: req.session.user.role === 'manager'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).render('error', { title: 'Error', message: 'Unable to load dashboard', error });
  }
});

module.exports = router;
