// Milestone Routes - Manages milestone types and participant milestones
const express = require('express');
const router = express.Router();
const db = require('../config/database');

// List all milestones with participant info
router.get('/', async (req, res) => {
  try {
    const milestones = await db('milestones')
      .join('participants', 'milestones.participant_id', 'participants.participant_id')
      .join('milestonetypes', 'milestones.milestone_type_id', 'milestonetypes.milestone_type_id')
      .select('milestones.*',
              'participants.participant_first_name as first_name',
              'participants.participant_last_name as last_name',
              'milestonetypes.milestone_title as milestone_name')
      .orderBy('milestones.milestone_date', 'desc')
      .limit(100);

    res.render('milestones/index', {
      title: 'Participant Milestones',
      milestones,
      isManager: req.session.user.role === 'manager'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).render('error', { title: 'Error', message: 'Unable to load milestones', error });
  }
});

// Milestone types management
router.get('/types', async (req, res) => {
  try {
    const types = await db('milestone_types').select('*').orderBy('milestone_name');
    res.render('milestones/types', {
      title: 'Milestone Types',
      types,
      isManager: req.session.user.role === 'manager'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).render('error', { title: 'Error', message: 'Unable to load milestone types', error });
  }
});

// Add milestone to participant (Manager only)
router.post('/', async (req, res) => {
  if (req.session.user.role !== 'manager') return res.status(403).send('Access denied');
  
  try {
    await db('milestones').insert({
      participant_email: req.body.participant_email,
      milestone_type_id: req.body.milestone_type_id,
      date_achieved: req.body.date_achieved || new Date(),
      notes: req.body.notes || null
    });
    res.redirect(`/participants?success=Milestone added`);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).render('error', { title: 'Error', message: 'Unable to add milestone', error });
  }
});

// Delete milestone (Manager only)
router.post('/:id/delete', async (req, res) => {
  if (req.session.user.role !== 'manager') return res.status(403).send('Access denied');
  
  try {
    await db('milestones').where({ milestone_id: req.params.id }).del();
    res.redirect('/milestones?success=Milestone deleted');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).render('error', { title: 'Error', message: 'Unable to delete milestone', error });
  }
});

module.exports = router;
