function saveToken(token) {
  localStorage.setItem('supamart_token', token);
}

function getToken() {
  return localStorage.getItem('supamart_token');
}

function removeToken() {
  localStorage.removeItem('supamart_token');
  localStorage.removeItem('supamart_user');
}

function saveUser(user) {
  localStorage.setItem('supamart_user', JSON.stringify(user));
}

function getUser() {
  const user = localStorage.getItem('supamart_user');
  return user ? JSON.parse(user) : null;
}

function isLoggedIn() {
  return !!getToken();
}

function logout() {
  removeToken();
  window.location.href = '/pages/auth/login.html';
}

// Redirect to login if not authenticated
function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = '/pages/auth/login.html';
  }
}

// Redirect to home if already logged in
function redirectIfLoggedIn() {
  if (isLoggedIn()) {
    window.location.href = '/pages/home/index.html';
  }
}
