// ========================================================================
// Survey Routes
// Manages post-event surveys with full CRUD operations
// Common users: view only | Managers: full access
// ========================================================================

const express = require('express');
const router = express.Router();
const { db } = require('../server');

// ========================================================================
// GET /surveys - List all surveys
// ========================================================================
router.get('/', async (req, res) => {
  const { search, page = 1 } = req.query;
  const limit = 20;
  const offset = (page - 1) * limit;

  try {
    let query = db('surveys')
      .join('participants', 'surveys.participant_email', 'participants.participant_email')
      .select('surveys.*', 'participants.first_name', 'participants.last_name');

    // Search functionality
    if (search) {
      query = query.where(function() {
        this.where('participants.first_name', 'ilike', `%${search}%`)
          .orWhere('participants.last_name', 'ilike', `%${search}%`)
          .orWhere('surveys.event_name', 'ilike', `%${search}%`);
      });
    }

    // Get total count
    const countQuery = query.clone().count('* as count');
    const [{ count }] = await countQuery;
    const totalPages = Math.ceil(count / limit);

    // Get paginated results
    const surveys = await query
      .orderBy('surveys.survey_date', 'desc')
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
