// ========================================================================
// Event Routes
// Manages event templates and occurrences with full CRUD operations
// Common users: view only | Managers: full access
// ========================================================================

const express = require('express');
const router = express.Router();
const { db } = require('../server');

// ========================================================================
// GET /events - List all event templates
// ========================================================================
router.get('/', async (req, res) => {
  const { search, type, page = 1 } = req.query;
  const limit = 20;
  const offset = (page - 1) * limit;

  try {
    let query = db('event_templates').select('*');

    // Search functionality
    if (search) {
      query = query.where('event_name', 'ilike', `%${search}%`);
    }

    // Filter by type
    if (type) {
      query = query.where('event_type', type);
    }

    // Get total count for pagination
    const countQuery = query.clone().count('* as count');
    const [{ count }] = await countQuery;
    const totalPages = Math.ceil(count / limit);

    // Get paginated results
    const events = await query
      .orderBy('event_name', 'asc')
      .limit(limit)
      .offset(offset);

    // Get distinct event types for filter
    const eventTypes = await db('event_templates')
      .distinct('event_type')
      .orderBy('event_type');

    res.render('events/index', {
      title: 'Events',
      events,
      eventTypes: eventTypes.map(t => t.event_type),
      search: search || '',
      selectedType: type || '',
      currentPage: parseInt(page),
      totalPages,
      isManager: req.session.user.role === 'manager'
    });

  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Unable to load events',
      error
    });
  }
});

// ========================================================================
// GET /events/new - Show create event form (Manager only)
// ========================================================================
router.get('/new', async (req, res) => {
  if (req.session.user.role !== 'manager') {
    return res.status(403).send('Access denied');
  }

  res.render('events/form', {
    title: 'Add New Event',
    event: {},
    action: '/events',
    method: 'POST',
    isManager: true
  });
});

// ========================================================================
// POST /events - Create new event template (Manager only)
// ========================================================================
router.post('/', async (req, res) => {
  if (req.session.user.role !== 'manager') {
    return res.status(403).send('Access denied');
  }

  const {
    event_name,
    event_type,
    description,
    target_age_min,
    target_age_max
  } = req.body;

  try {
    await db('event_templates').insert({
      event_name,
      event_type,
      description: description || null,
      target_age_min: target_age_min ? parseInt(target_age_min) : null,
      target_age_max: target_age_max ? parseInt(target_age_max) : null
    });

    res.redirect('/events?success=Event created successfully');

  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Unable to create event',
      error
    });
  }
});

// ========================================================================
// GET /events/:id - View event details and occurrences
// ========================================================================
router.get('/:id', async (req, res) => {
  try {
    const event = await db('event_templates')
      .where({ event_template_id: req.params.id })
      .first();

    if (!event) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Event not found',
        error: { status: 404 }
      });
    }

    // Get all occurrences for this event
    const occurrences = await db('event_occurrences')
      .where({ event_name: event.event_name })
      .orderBy('event_datetime_start', 'desc');

    // Get registration count for each occurrence
    for (let occurrence of occurrences) {
      const [{ count }] = await db('registrations')
        .where({
          event_name: occurrence.event_name,
          event_datetime_start: occurrence.event_datetime_start
        })
        .count('* as count');
      occurrence.registration_count = count;
    }

    res.render('events/detail', {
      title: event.event_name,
      event,
      occurrences,
      isManager: req.session.user.role === 'manager'
    });

  } catch (error) {
    console.error('Error fetching event details:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Unable to load event details',
      error
    });
  }
});

// ========================================================================
// GET /events/:id/edit - Show edit form (Manager only)
// ========================================================================
router.get('/:id/edit', async (req, res) => {
  if (req.session.user.role !== 'manager') {
    return res.status(403).send('Access denied');
  }

  try {
    const event = await db('event_templates')
      .where({ event_template_id: req.params.id })
      .first();

    if (!event) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Event not found',
        error: { status: 404 }
      });
    }

    res.render('events/form', {
      title: 'Edit Event',
      event,
      action: `/events/${req.params.id}`,
      method: 'POST',
      isManager: true
    });

  } catch (error) {
    console.error('Error fetching event for edit:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Unable to load event',
      error
    });
  }
});

// ========================================================================
// POST /events/:id - Update event template (Manager only)
// ========================================================================
router.post('/:id', async (req, res) => {
  if (req.session.user.role !== 'manager') {
    return res.status(403).send('Access denied');
  }

  const {
    event_type,
    description,
    target_age_min,
    target_age_max
  } = req.body;

  try {
    await db('event_templates')
      .where({ event_template_id: req.params.id })
      .update({
        event_type,
        description: description || null,
        target_age_min: target_age_min ? parseInt(target_age_min) : null,
        target_age_max: target_age_max ? parseInt(target_age_max) : null
      });

    res.redirect(`/events/${req.params.id}?success=Event updated successfully`);

  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Unable to update event',
      error
    });
  }
});

// ========================================================================
// POST /events/:id/delete - Delete event template (Manager only)
// ========================================================================
router.post('/:id/delete', async (req, res) => {
  if (req.session.user.role !== 'manager') {
    return res.status(403).send('Access denied');
  }

  try {
    await db('event_templates')
      .where({ event_template_id: req.params.id })
      .del();

    res.redirect('/events?success=Event deleted successfully');

  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Unable to delete event. It may have related records.',
      error
    });
  }
});

// ========================================================================
// GET /events/:id/occurrences/new - Create new occurrence (Manager only)
// ========================================================================
router.get('/:id/occurrences/new', async (req, res) => {
  if (req.session.user.role !== 'manager') {
    return res.status(403).send('Access denied');
  }

  try {
    const event = await db('event_templates')
      .where({ event_template_id: req.params.id })
      .first();

    if (!event) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Event not found',
        error: { status: 404 }
      });
    }

    res.render('events/occurrence-form', {
      title: `Add Occurrence - ${event.event_name}`,
      event,
      occurrence: {},
      action: `/events/${req.params.id}/occurrences`,
      method: 'POST',
      isManager: true
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Unable to load form',
      error
    });
  }
});

// ========================================================================
// POST /events/:id/occurrences - Create event occurrence (Manager only)
// ========================================================================
router.post('/:id/occurrences', async (req, res) => {
  if (req.session.user.role !== 'manager') {
    return res.status(403).send('Access denied');
  }

  const {
    event_datetime_start,
    event_datetime_end,
    location,
    capacity
  } = req.body;

  try {
    const event = await db('event_templates')
      .where({ event_template_id: req.params.id })
      .first();

    await db('event_occurrences').insert({
      event_name: event.event_name,
      event_datetime_start,
      event_datetime_end: event_datetime_end || null,
      location: location || null,
      capacity: capacity ? parseInt(capacity) : null
    });

    res.redirect(`/events/${req.params.id}?success=Event occurrence added successfully`);

  } catch (error) {
    console.error('Error creating occurrence:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Unable to create event occurrence',
      error
    });
  }
});

module.exports = router;
