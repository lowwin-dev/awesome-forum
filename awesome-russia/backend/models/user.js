const pool = require('../db');
const bcrypt = require('bcrypt');

async function createUser(username, email, password, role = 'user') {
  const hash = await bcrypt.hash(password, 10);
  const res = await pool.query(
    'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role, created_at',
    [username, email, hash, role]
  );
  return res.rows[0];
}

async function getUserByUsername(username) {
  const res = await pool.query('SELECT * FROM users WHERE username=$1', [username]);
  return res.rows[0];
}

module.exports = { createUser, getUserByUsername };
