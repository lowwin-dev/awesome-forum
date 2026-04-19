const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

const sequelize = new Sequelize({ dialect: 'sqlite', storage: 'database.sqlite' });
const upload = multer({ dest: 'uploads/' });
const SECRET = 'secret123';

// ===== Модели =====
const User = sequelize.define('User', {
  username: { type: DataTypes.STRING, unique: true },
  password: DataTypes.STRING,
  role: { type: DataTypes.STRING, defaultValue: 'Игрок' },
  banned: { type: DataTypes.BOOLEAN, defaultValue: false },
  banReason: DataTypes.STRING,
  banDuration: DataTypes.STRING,
  avatar: DataTypes.STRING,
  banner: DataTypes.STRING,
  status: DataTypes.STRING
});

const Topic = sequelize.define('Topic', {
  title: DataTypes.STRING,
  content: DataTypes.TEXT
});

const Complaint = sequelize.define('Complaint', {
  reason: DataTypes.STRING,
  status: { type: DataTypes.STRING, defaultValue: 'pending' },
  topicId: DataTypes.INTEGER
});

User.hasMany(Topic);
Topic.belongsTo(User);
User.hasMany(Complaint);
Complaint.belongsTo(User);

// ===== Middleware =====
function auth(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.sendStatus(401);
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.sendStatus(401);
  }
}

// ===== Routes =====

// Регистрация
app.post('/register', async (req, res) => {
  const exists = await User.findOne({ where: { username: req.body.username } });
  if (exists) return res.status(400).json({ error: 'Пользователь существует' });
  const hash = await bcrypt.hash(req.body.password, 10);
  const user = await User.create({ username: req.body.username, password: hash });
  res.json(user);
});

// Логин
app.post('/login', async (req, res) => {
  const user = await User.findOne({ where: { username: req.body.username } });
  if (!user) return res.sendStatus(404);
  if (user.banned) return res.status(403).json({ error: `Забанен: ${user.banReason} до ${user.banDuration}` });
  if (!await bcrypt.compare(req.body.password, user.password)) return res.sendStatus(401);

  const token = jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '7d' });
  res.json({ token });
});

// ===== Темы =====
app.get('/topics', async (req, res) => {
  const topics = await Topic.findAll({ include: User });
  res.json(topics);
});

app.post('/topics', auth, async (req, res) => {
  const topic = await Topic.create({ title: req.body.title, content: req.body.content, UserId: req.user.id });
  res.json(topic);
});

// ===== Жалобы =====
app.post('/complaint', auth, async (req, res) => {
  const c = await Complaint.create({ reason: req.body.reason, UserId: req.user.id, topicId: req.body.topicId });
  res.json(c);
});

// ===== Профиль =====
app.post('/profile', auth, upload.fields([{name:'avatar'},{name:'banner'}]), async (req,res)=>{
  const user = await User.findByPk(req.user.id);
  if(req.body.username) user.username = req.body.username;
  if(req.body.status) user.status = req.body.status;
  if(req.files.avatar) user.avatar = req.files.avatar[0].path;
  if(req.files.banner) user.banner = req.files.banner[0].path;
  await user.save();
  res.json(user);
});

// ===== Админка =====
app.get('/users', auth, async (req,res)=>{
  if(!req.user.role.includes('Админ')) return res.sendStatus(403);
  const users = await User.findAll();
  res.json(users);
});

app.post('/ban/:id', auth, async (req,res)=>{
  if(!req.user.role.includes('Админ')) return res.sendStatus(403);
  const u = await User.findByPk(req.params.id);
  if(!u) return res.sendStatus(404);
  u.banned = true;
  u.banReason = req.body.reason;
  u.banDuration = req.body.duration;
  await u.save();
  res.json({ok:true});
});

app.post('/changeRole/:id', auth, async (req,res)=>{
  if(!req.user.role.includes('Админ')) return res.sendStatus(403);
  const u = await User.findByPk(req.params.id);
  if(!u) return res.sendStatus(404);
  u.role = req.body.role;
  await u.save();
  res.json({ok:true});
});

// ===== Запуск сервера =====
const PORT = process.env.PORT || 3000;
sequelize.sync().then(()=>{
  app.listen(PORT, ()=>console.log(`🔥 Server started on port ${PORT}`));
});
