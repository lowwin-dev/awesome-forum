const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const categoriesRoutes = require('./routes/categories');
const topicsRoutes = require('./routes/topics');
const postsRoutes = require('./routes/posts');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/topics', topicsRoutes);
app.use('/api/posts', postsRoutes);

app.listen(5000, () => console.log('Awesome Russia backend running on port 5000'));
