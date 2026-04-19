let token = null;
let currentUser = null;

// ======= UI =======
function renderLogin() {
  document.body.innerHTML = `
    <h2>Регистрация</h2>
    <input id="regUser" placeholder="Имя">
    <input id="regPass" type="password" placeholder="Пароль">
    <button onclick="register()">Регистрация</button>

    <h2>Вход</h2>
    <input id="logUser" placeholder="Имя">
    <input id="logPass" type="password" placeholder="Пароль">
    <button onclick="login()">Вход</button>
  `;
}

function renderForum() {
  document.body.innerHTML = `
    <h1>Добро пожаловать, ${currentUser.username}</h1>
    <button onclick="logout()">Выход</button>
    <button onclick="editProfile()">Редактировать профиль</button>

    <h2>Создать тему</h2>
    <input id="newTopicTitle" placeholder="Заголовок">
    <textarea id="newTopicContent" placeholder="Содержание"></textarea>
    <button onclick="createTopic()">Создать</button>

    <h2>Темы</h2>
    <div id="topicsList"></div>

    ${currentUser.role.startsWith('Админ') ? `<h2>Панель админа</h2><div id="adminPanel"></div>` : ''}
  `;

  loadTopics();
  if(currentUser.role.startsWith('Админ')) loadAdminPanel();
}

// ======= API =======
async function register() {
  const username = document.getElementById('regUser').value;
  const password = document.getElementById('regPass').value;

  const res = await fetch('/register', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({username,password})
  });

  if(res.ok) alert('Аккаунт создан!');
  else alert('Ошибка регистрации');
}

async function login() {
  const username = document.getElementById('logUser').value;
  const password = document.getElementById('logPass').value;

  const res = await fetch('/login',{
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({username,password})
  });

  if(res.ok){
    const data = await res.json();
    token = data.token;
    await fetchCurrentUser();
    renderForum();
  } else alert('Ошибка входа');
}

function logout() {
  token = null;
  currentUser = null;
  renderLogin();
}

async function fetchCurrentUser() {
  const payload = JSON.parse(atob(token.split('.')[1]));
  currentUser = {id:payload.id, role:payload.role, username:'Игрок', avatar:'', banner:'', status:''};
}

// ======= Темы =======
async function loadTopics() {
  const res = await fetch('/topics');
  const topics = await res.json();
  const container = document.getElementById('topicsList');
  container.innerHTML = topics.map(t=>`
    <div style="border:1px solid #ccc; padding:5px; margin:5px;">
      <strong>${t.title}</strong> от ${t.User.username}
      <p>${t.content}</p>
      <button onclick="complain(${t.id})">Жалоба</button>
    </div>
  `).join('');
}

async function createTopic() {
  const title = document.getElementById('newTopicTitle').value;
  const content = document.getElementById('newTopicContent').value;
  await fetch('/topics',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':token},
    body:JSON.stringify({title,content})
  });
  loadTopics();
}

// ======= Профиль =======
function editProfile() {
  const name = prompt('Новое имя:', currentUser.username);
  const status = prompt('Статус:', currentUser.status||'');
  const avatar = prompt('Ссылка на аватар:', currentUser.avatar||'');
  const banner = prompt('Ссылка на баннер:', currentUser.banner||'');

  if(name) currentUser.username = name;
  if(status) currentUser.status = status;
  if(avatar) currentUser.avatar = avatar;
  if(banner) currentUser.banner = banner;

  renderForum();
}

// ======= Жалобы =======
function complain(topicId) {
  const reason = prompt('Причина жалобы:');
  if(!reason) return;
  fetch('/complaint', {
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':token},
    body:JSON.stringify({topicId,reason})
  });
  alert('Жалоба отправлена!');
}

// ======= Админка =======
async function loadAdminPanel() {
  const res = await fetch('/users',{headers:{Authorization:token}});
  const users = await res.json();
  const panel = document.getElementById('adminPanel');
  panel.innerHTML = users.map(u=>`
    <div>
      ${u.username} (${u.role})
      <button onclick="banUser(${u.id})">Заблокировать</button>
      <button onclick="changeRole(${u.id})">Сменить роль</button>
    </div>
  `).join('');
}

async function banUser(userId) {
  const reason = prompt('Причина бана:');
  if(!reason) return;
  const duration = prompt('Срок бана: (1 день, 7 дней, 30 дней, Навсегда)');
  await fetch('/ban/'+userId,{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':token},
    body:JSON.stringify({reason,duration})
  });
  loadAdminPanel();
}

async function changeRole(userId) {
  const role = prompt('Введите новую роль для пользователя:');
  if(!role) return;
  await fetch('/changeRole/'+userId,{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':token},
    body:JSON.stringify({role})
  });
  loadAdminPanel();
}

// ======= ИНИЦИАЛИЗАЦИЯ =======
renderLogin();
