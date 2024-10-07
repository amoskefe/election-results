const express = require('express');
const mysql = require('mysql2');
const { body, validationResult } = require('express-validator');
const app = express();
require('dotenv').config();

// Set EJS as the template engine
app.set('view engine', 'ejs');

// Middleware to parse URL-encoded bodies (for form submissions)
app.use(express.urlencoded({ extended: true }));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).send('Something went wrong! Please try again later.');
});

// MySQL connection setup
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost', 
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password', // Ensure this matches your MySQL password
  database: process.env.DB_NAME || 'bincom_test'
});

db.connect(err => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Connected to the database');
});

// Route to display results for a specific polling unit
app.get('/polling-unit/:id', (req, res) => {
  const pollingUnitId = req.params.id;
  const query = `
    SELECT party_abbreviation, party_score 
    FROM announced_pu_results 
    WHERE polling_unit_uniqueid = ?;
  `;

  db.query(query, [pollingUnitId], (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).send('Internal Server Error');
    }
    res.render('polling_unit', { results });
  });
});

// Route to display summed total results for a specific LGA
app.get('/lga/:id', (req, res) => {
  const lgaId = req.params.id;
  const query = `
    SELECT party_abbreviation, SUM(party_score) AS total_score 
    FROM announced_pu_results 
    JOIN polling_unit ON polling_unit.polling_unit_uniqueid = announced_pu_results.polling_unit_uniqueid
    WHERE polling_unit.lga_id = ?
    GROUP BY party_abbreviation;
  `;

  db.query(query, [lgaId], (err, results) => {
    if (err) {
      console.error('Error executing query:', err);
      return res.status(500).send('Internal Server Error');
    }
    res.render('lga_results', { results });
  });
});

// Route to render the form for adding new polling unit results
app.get('/new-polling-unit', (req, res) => {
  res.render('new_polling_unit');
});

// Route to handle form submission for new polling unit results
app.post('/new-polling-unit', [
  body('polling_unit_uniqueid').isInt().withMessage('Polling Unit ID must be an integer'),
  body('party_abbreviation').isLength({ min: 1 }).withMessage('Party Abbreviation is required'),
  body('party_score').isInt().withMessage('Party Score must be an integer')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
});

// Start the server
app.listen(3000, () => {
  console.log('Server running on port 3000');
});
