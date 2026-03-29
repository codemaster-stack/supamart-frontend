// Redirect if already logged in as admin
const existingUser = getUser();
if (existingUser && existingUser.role === 'admin') {
  window.location.href = '/pages/admin/admin.html';
}

const SETUP_KEY = 'supamart-admin-2024';

document.getElementById('adminForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const setupKey = document.getElementById('setupKey').value;

  // Validate setup key
  if (setupKey !== SETUP_KEY) {
    showAlert('Invalid setup key');
    return;
  }

  if (!name || !email || !password) {
    showAlert('Please fill all fields');
    return;
  }

  if (password.length < 6) {
    showAlert('Password must be at least 6 characters');
    return;
  }

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Creating...';

  try {
    // Register as buyer first
    const data = await apiRequest('/auth/register', 'POST', {
      name,
      email,
      password,
      role: 'buyer'
    });

    // Now upgrade to admin via special endpoint
    const upgradeData = await apiRequest('/auth/make-admin', 'POST', {
      email,
      setupKey: SETUP_KEY
    });

    saveToken(data.token);
    saveUser({ ...data.user, role: 'admin' });

    showAlert('Admin account created successfully!', 'success');

    setTimeout(() => {
      window.location.href = '/pages/admin/admin.html';
    }, 2000);

  } catch (error) {
    showAlert(error.message || 'Failed to create admin account');
    btn.disabled = false;
    btn.innerHTML = 'Create Admin Account';
  }
});

function showAlert(message, type = 'error') {
  const box = type === 'error'
    ? document.getElementById('alertBox')
    : document.getElementById('successBox');
  box.textContent = message;
  box.className = `alert alert-${type} show`;
}