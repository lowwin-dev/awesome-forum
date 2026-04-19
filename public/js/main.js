let token = '';
let currentUser = null;

async function api(url, method='GET', body=null){
  const headers = token ? {'Authorization': token,'Content-Type':'application/json'} : {'Content-Type':'application/json'};
  const res = await fetch(url, {method, headers, body: body ? JSON.stringify(body) : null});
  return res.json();
}

function showMessage(msg){ alert(msg); }

async function register() {
  const username = document.getElementById('usernameReg').value;
  const password = document.getElementById('passwordReg').value;
  await api('/register','POST',{username,password});
  showMessage('Аккаунт создан');
}

async function login() {
  const username = document.getElementById('usernameLogin').value;
  const password = document.getElementById('passwordLogin').value;
  const res = await api('/login','POST',{username,password});
  if(res.token){ token=res.token; loadProfile(); loadTopics(); showMessage('Вы вошли'); }
  else if(res.error){ showMessage(res.error); if(res.error.includes('Забанен')) showBanWindow(res.error); }
}

function logout(){ token=''; currentUser=null; location.reload(); }

async function loadProfile() {
  const users = await api('/users','GET');
  currentUser = users.find(u => u.id==jwtDecode(token).id);
  if(currentUser?.banned) showBanWindow(currentUser);
  document.getElementById('profileName').innerText = currentUser.username;
}

async function createTopic() {
  const title = document.getElementById('topicTitle').value;
  const content = document.getElementById('topicContent').value;
  await api('/topics','POST',{title,content});
  loadTopics();
}

async function loadTopics() {
  const topics = await api('/topics');
  const div = document.getElementById('topicsList');
  div.innerHTML='';
  topics.forEach(t=>{
    const d=document.createElement('div');
    d.innerHTML=`<strong class="role-${t.User.role.replace(/\s/g,'')}">${t.User.username}</strong>: ${t.title} <p>${t.content}</p>`;
    div.appendChild(d);
  });
}

async function banUser(id, reason, duration){
  await api(`/ban/${id}`,'POST',{reason,duration,admin:currentUser.username});
  loadUsers();
}

function showBanWindow(user){
  const div=document.getElementById('banWindow');
  div.style.display='block';
  div.innerHTML=`<h3>Вы заблокированы</h3>
    <p>Ник админа: ${user.banAdmin}</p>
    <p>Причина: ${user.banReason}</p>
    <p>Срок: ${user.banDuration}</p>
    <p>Дата: ${new Date().toLocaleString()}</p>
    <p>Апелляция:</p>
    <button onclick="appealBan()">Подать апелляцию</button>`;
  document.body.style.pointerEvents='none';
  div.style.pointerEvents='all';
}

function appealBan(){
  const reason=prompt('Причина апелляции:');
  if(reason) alert('Апелляция отправлена');
}

async function loadUsers(){
  const users = await api('/users','GET');
  const div = document.getElementById('adminPanel'); div.innerHTML='';
  users.forEach(u=>{
    const d=document.createElement('div');
    d.innerHTML=`<span class="role-${u.role.replace(/\s/g,'')}">${u.username} (${u.role})</span>
      <button onclick="banUserPrompt(${u.id})">Забанить</button>
      <button onclick="changeRolePrompt(${u.id})">Изменить роль</button>`;
    div.appendChild(d);
  });
}

function banUserPrompt(id){
  const reason=prompt('Причина:'); const duration=prompt('Срок:');
  if(reason && duration) banUser(id,reason,duration);
}

function changeRolePrompt(id){
  const role=prompt('Новая роль:'); if(role) api(`/changeRole/${id}`,'POST',{role});
}

function jwtDecode(t){ try{return JSON.parse(atob(t.split('.')[1]));}catch{return{};} }

window.onload=function(){ if(token){ loadProfile(); loadTopics(); } };
