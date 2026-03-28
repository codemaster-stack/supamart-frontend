redirectIfLoggedIn();

const loginForm = document.getElementById('loginForm');
const alertBox = document.getElementById('alertBox');
const submitBtn = document.getElementById('submitBtn');

function showAlert(message, type = 'error') {
  alertBox.textContent = message;
  alertBox.className = `alert alert-${type} show`;
}

function setLoading(loading) {
  if (loading) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Signing in...';
  } else {
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Sign In';
  }
}

function togglePassword(fieldId) {
  const field = document.getElementById(fieldId);
  field.type = field.type === 'password' ? 'text' : 'password';
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) {
    return showAlert('Please enter your email and password');
  }

  setLoading(true);

  try {
    const data = await apiRequest('/auth/login', 'POST', { email, password });

    saveToken(data.token);
    saveUser(data.user);

    showAlert('Login successful! Redirecting...', 'success');

    setTimeout(() => {
  const role = data.user.role;
  if (role === 'admin') {
    window.location.href = '/pages/admin/admin.html';
  } else if (role === 'seller') {
    window.location.href = '/pages/seller/dashboard.html';
  } else {
    window.location.href = '/pages/home/index.html';
  }
}, 1200);

  } catch (error) {
    showAlert(error.message || 'Login failed. Please try again.');
  } finally {
    setLoading(false);
  }
});
