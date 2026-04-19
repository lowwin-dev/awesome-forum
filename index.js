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

// Models
const User = sequelize.define('User',{
  username:{type:DataTypes.STRING,unique:true},
  password:DataTypes.STRING,
  role:{type:DataTypes.STRING, defaultValue:'Игрок'},
  banned:{type:DataTypes.BOOLEAN, defaultValue:false},
  avatar:DataTypes.STRING,
  banner:DataTypes.STRING,
  status:DataTypes.STRING
});
const Topic = sequelize.define('Topic',{title:DataTypes.STRING, content:DataTypes.TEXT});
const Complaint = sequelize.define('Complaint',{reason:DataTypes.STRING, status:{type:DataTypes.STRING, defaultValue:'pending'}});

User.hasMany(Topic); Topic.belongsTo(User);
User.hasMany(Complaint); Complaint.belongsTo(User);

const SECRET = "secret123";
const upload = multer({ dest:'uploads/' });

// Auth middleware
function auth(req,res,next){
  const token = req.headers.authorization;
  if(!token) return res.sendStatus(401);
  try{ req.user = jwt.verify(token,SECRET); next(); } catch{ res.sendStatus(401); }
}

// Routes
app.post('/register', async (req,res)=>{
  const exists = await User.findOne({where:{username:req.body.username}});
  if(exists) return res.status(400).json({error:'Пользователь существует'});
  const hash = await bcrypt.hash(req.body.password,10);
  const u = await User.create({username:req.body.username,password:hash});
  res.json(u);
});

app.post('/login', async (req,res)=>{
  const user = await User.findOne({where:{username:req.body.username}});
  if(!user) return res.sendStatus(404);
  if(user.banned) return res.status(403).json({error:'Забанен'});
  if(!await bcrypt.compare(req.body.password,user.password)) return res.sendStatus(401);
  res.json({token:jwt.sign({id:user.id,role:user.role},SECRET,{expiresIn:'7d'})});
});

// Topics
app.get('/topics',async (req,res)=>res.json(await Topic.findAll({include:User})));
app.post('/topics',auth,async (req,res)=>{res.json(await Topic.create({title:req.body.title,content:req.body.content,UserId:req.user.id}));});

// Complaints
app.post('/complaints',auth,upload.single('proof'),async (req,res)=>{const c = await Complaint.create({reason:req.body.reason,UserId:req.user.id});res.json(c);});

// Admin
app.get('/users',auth,async (req,res)=>{if(req.user.role!=='Администратор') return res.sendStatus(403);res.json(await User.findAll());});
app.post('/ban/:id',auth,async (req,res)=>{if(req.user.role!=='Администратор') return res.sendStatus(403); const u = await User.findByPk(req.params.id); if(!u) return res.sendStatus(404); u.banned=true; await u.save(); res.json({ok:true});});
app.get('/complaints',auth,async (req,res)=>{if(req.user.role!=='Администратор') return res.sendStatus(403); res.json(await Complaint.findAll({include:User}));});
app.post('/complaints/:id',auth,async (req,res)=>{const c=await Complaint.findByPk(req.params.id); if(!c) return res.sendStatus(404); c.status=req.body.status; await c.save(); res.json({ok:true});});

// Launch
const PORT = process.env.PORT||3000;
sequelize.sync().then(()=>app.listen(PORT,()=>console.log(`🔥 Server started on port ${PORT}`)));
