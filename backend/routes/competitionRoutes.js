const express = require('express');
const router = express.Router();
const { getCompetitions, getCompetitionById } = require('../controllers/competitionController');

router.get('/', getCompetitions);
router.get('/:id', getCompetitionById);

module.exports = router;
