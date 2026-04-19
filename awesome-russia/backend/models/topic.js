const pool = require('../db');

async function createTopic(category_id, author_id, title) {
  const res = await pool.query(
    'INSERT INTO topics (category_id, author_id, title) VALUES ($1, $2, $3) RETURNING *',
    [category_id, author_id, title]
  );
  return res.rows[0];
}

async function getTopicsByCategory(category_id) {
  const res = await pool.query(
    'SELECT t.*, u.username as author_name FROM topics t JOIN users u ON t.author_id = u.id WHERE t.category_id=$1 ORDER BY t.pinned DESC, t.created_at DESC',
    [category_id]
  );
  return res.rows;
}

module.exports = { createTopic, getTopicsByCategory };
