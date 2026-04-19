const pool = require('../db');

async function getAllCategories() {
  const res = await pool.query('SELECT * FROM categories ORDER BY sort_order');
  return res.rows;
}

module.exports = { getAllCategories };
