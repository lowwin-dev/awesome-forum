const express = require('express');
const router = express.Router();
const { createPost, getPostsByTopic } = require('../models/post');
const authMiddleware = require('../middleware/auth');

router.get('/topic/:id', async (req, res) => {
  const posts = await getPostsByTopic(req.params.id);
  res.json(posts);
});

router.post('/', authMiddleware, async (req, res) => {
  const { topic_id, content } = req.body;
  const post = await createPost(topic_id, req.user.id, content);
  res.json(post);
});

module.exports = router;
