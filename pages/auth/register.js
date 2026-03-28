// Redirect if already logged in
redirectIfLoggedIn();

const registerForm = document.getElementById('registerForm');
const alertBox = document.getElementById('alertBox');
const submitBtn = document.getElementById('submitBtn');

function showAlert(message, type = 'error') {
  alertBox.textContent = message;
  alertBox.className = `alert alert-${type} show`;
}

function setLoading(loading) {
  if (loading) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Creating account...';
  } else {
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Create Account';
  }
}

function togglePassword(fieldId) {
  const field = document.getElementById(fieldId);
  field.type = field.type === 'password' ? 'text' : 'password';
}

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const role = document.getElementById('role').value;

  // Basic validation
  if (!name || !email || !password) {
    return showAlert('Please fill in all fields');
  }

  if (password.length < 6) {
    return showAlert('Password must be at least 6 characters');
  }

  setLoading(true);

  try {
    const data = await apiRequest('/auth/register', 'POST', {
      name, email, password, role
    });

    // Save token and user
    saveToken(data.token);
    saveUser(data.user);

    showAlert('Account created successfully! Redirecting...', 'success');

    // Redirect based on role
    setTimeout(() => {
  if (data.user.role === 'seller') {
    window.location.href = '/pages/seller/onboarding.html';
  } else {
    window.location.href = '/pages/home/index.html';
  }
}, 1500);

  } catch (error) {
    showAlert(error.message || 'Registration failed. Please try again.');
  } finally {
    setLoading(false);
  }
});