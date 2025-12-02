// ========================================================================
// Survey Routes
// Manages post-event surveys with full CRUD operations
// Common users: view only | Managers: full access
// ========================================================================

const express = require('express');
const router = express.Router();
const db = require('../config/database');

// ========================================================================
// GET /surveys - List all surveys
// ========================================================================
router.get('/', async (req, res) => {
  const { search, page = 1 } = req.query;
  const limit = 20;
  const offset = (page - 1) * limit;

  try {
    let query = db('surveys')
      .leftJoin('registrations', 'surveys.registration_id', 'registrations.registration_id')
      .leftJoin('participants', 'registrations.participant_id', 'participants.participant_id')
      .leftJoin('eventoccurrences', 'registrations.event_occurrence_id', 'eventoccurrences.event_occurrence_id')
      .leftJoin('events', 'eventoccurrences.event_template_id', 'events.event_template_id')
      .select('surveys.*',
              'participants.participant_first_name as first_name',
              'participants.participant_last_name as last_name',
              'events.event_name');

    // Search functionality
    if (search) {
      query = query.where(function() {
        this.where('participants.participant_first_name', 'ilike', `%${search}%`)
          .orWhere('participants.participant_last_name', 'ilike', `%${search}%`)
          .orWhere('events.event_name', 'ilike', `%${search}%`);
      });
    }

    // Get total count
    let countQuery = db('surveys');
    if (search) {
      countQuery = countQuery
        .leftJoin('registrations', 'surveys.registration_id', 'registrations.registration_id')
        .leftJoin('participants', 'registrations.participant_id', 'participants.participant_id')
        .leftJoin('eventoccurrences', 'registrations.event_occurrence_id', 'eventoccurrences.event_occurrence_id')
        .leftJoin('events', 'eventoccurrences.event_template_id', 'events.event_template_id')
        .where(function() {
          this.where('participants.participant_first_name', 'ilike', `%${search}%`)
            .orWhere('participants.participant_last_name', 'ilike', `%${search}%`)
            .orWhere('events.event_name', 'ilike', `%${search}%`);
        });
    }
    const [{ count }] = await countQuery.count('surveys.survey_id as count');
    const totalPages = Math.ceil(count / limit);

    // Get paginated results
    const surveys = await query
      .orderBy('surveys.survey_submission_date', 'desc')
      .limit(limit)
      .offset(offset);

    res.render('surveys/index', {
      title: 'Post-Event Surveys',
      surveys,
      search: search || '',
      currentPage: parseInt(page),
      totalPages,
      isManager: req.session.user.role === 'manager'
    });

  } catch (error) {
    console.error('Error fetching surveys:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Unable to load surveys',
      error
    });
  }
});

// ========================================================================
// GET /surveys/:id - View survey details
// ========================================================================
router.get('/:id', async (req, res) => {
  try {
    const survey = await db('surveys')
      .join('participants', 'surveys.participant_email', 'participants.participant_email')
      .where({ 'surveys.survey_id': req.params.id })
      .select('surveys.*', 'participants.first_name', 'participants.last_name')
      .first();

    if (!survey) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Survey not found',
        error: { status: 404 }
      });
    }

    res.render('surveys/detail', {
      title: 'Survey Details',
      survey,
      isManager: req.session.user.role === 'manager'
    });

  } catch (error) {
    console.error('Error fetching survey:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Unable to load survey',
      error
    });
  }
});

// ========================================================================
// POST /surveys/:id/delete - Delete survey (Manager only)
// ========================================================================
router.post('/:id/delete', async (req, res) => {
  if (req.session.user.role !== 'manager') {
    return res.status(403).send('Access denied');
  }

  try {
    await db('surveys')
      .where({ survey_id: req.params.id })
      .del();

    res.redirect('/surveys?success=Survey deleted successfully');

  } catch (error) {
    console.error('Error deleting survey:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Unable to delete survey',
      error
    });
  }
});

module.exports = router;
