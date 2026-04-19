const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: 'database.sqlite'
});

// МОДЕЛИ
const User = sequelize.define('User', {
  username: { type: DataTypes.STRING, unique: true },
  password: DataTypes.STRING,
  role: { type: DataTypes.STRING, defaultValue: 'player' },
  banned: { type: DataTypes.BOOLEAN, defaultValue: false },
  banReason: DataTypes.STRING,
  banDuration: DataTypes.STRING,
  banAdmin: DataTypes.STRING
});

const Topic = sequelize.define('Topic', {
  title: DataTypes.STRING,
  content: DataTypes.TEXT
});

User.hasMany(Topic);
Topic.belongsTo(User);

const SECRET = "secret123";

// AUTH Middleware
function auth(req,res,next){
  const token = req.headers.authorization;
  if(!token) return res.sendStatus(401);
  try{
    req.user = jwt.verify(token, SECRET);
    next();
  }catch{
    res.sendStatus(401);
  }
}

// РЕГИСТРАЦИЯ
app.post('/register', async (req,res)=>{
  const hash = await bcrypt.hash(req.body.password,10);
  const user = await User.create({username:req.body.username,password:hash});
  res.json(user);
});

// ЛОГИН
app.post('/login', async (req,res)=>{
  const user = await User.findOne({where:{username:req.body.username}});
  if(!user) return res.json({error:'Пользователь не найден'});
  if(user.banned) return res.json({error:`Забанен. Причина: ${user.banReason}. Срок: ${user.banDuration}`});

  const ok = await bcrypt.compare(req.body.password,user.password);
  if(!ok) return res.json({error:'Неверный пароль'});

  const token = jwt.sign({id:user.id,role:user.role},SECRET);
  res.json({token});
});

// ТЕМЫ
app.get('/topics', async (req,res)=>{
  const topics = await Topic.findAll({include:User});
  res.json(topics);
});

app.post('/topics', auth, async (req,res)=>{
  const t = await Topic.create({
    title:req.body.title,
    content:req.body.content,
    UserId:req.user.id
  });
  res.json(t);
});

// АДМИН
app.get('/users', auth, async (req,res)=>{
  if(req.user.role !== 'admin') return res.sendStatus(403);
  const users = await User.findAll();
  res.json(users);
});

app.post('/ban/:id', auth, async (req,res)=>{
  if(req.user.role !== 'admin') return res.sendStatus(403);
  const u = await User.findByPk(req.params.id);
  u.banned = true;
  u.banReason = req.body.reason;
  u.banDuration = req.body.duration;
  u.banAdmin = req.body.admin;
  await u.save();
  res.json({ok:true});
});

app.post('/changeRole/:id', auth, async (req,res)=>{
  if(req.user.role !== 'admin') return res.sendStatus(403);
  const u = await User.findByPk(req.params.id);
  u.role = req.body.role;
  await u.save();
  res.json({ok:true});
});

// SERVER
sequelize.sync().then(()=>{
  app.listen(3000, ()=>console.log("🔥 SERVER STARTED on port 3000"));
});
