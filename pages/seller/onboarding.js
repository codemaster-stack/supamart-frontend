// Must be logged in and must be a seller
requireAuth();

const user = getUser();
if (user && user.role !== 'seller') {
  window.location.href = '/pages/home/index.html';
}

// Check if seller already has a store
(async () => {
  try {
    const data = await apiRequest('/stores/my-store', 'GET');
    if (data.store) {
      // Already has a store, go to dashboard
     window.location.href = '/pages/seller/dashboard.html';
    }
  } catch (e) {
    // No store yet — stay on this page
  }
})();

// ─── Step Navigation ──────────────────────────────────────
function goToStep2() {
  const businessName = document.getElementById('businessName').value.trim();
  const location = document.getElementById('location').value.trim();
  const phoneNumber = document.getElementById('phoneNumber').value.trim();

  if (!businessName || !location || !phoneNumber) {
    showAlert('Please fill in all fields before continuing');
    return;
  }

  if (phoneNumber.length < 10) {
    showAlert('Please enter a valid phone number with country code');
    return;
  }

  // Move to step 2
  document.getElementById('formStep1').classList.add('hidden');
  document.getElementById('formStep2').classList.remove('hidden');

  // Update progress indicators
  document.getElementById('step-indicator-1').classList.remove('active');
  document.getElementById('step-indicator-1').classList.add('done');
  document.getElementById('step-indicator-2').classList.add('active');
}

function goToStep1() {
  document.getElementById('formStep2').classList.add('hidden');
  document.getElementById('formStep1').classList.remove('hidden');

  document.getElementById('step-indicator-2').classList.remove('active');
  document.getElementById('step-indicator-1').classList.remove('done');
  document.getElementById('step-indicator-1').classList.add('active');
}

// ─── Logo Preview ─────────────────────────────────────────
function previewLogo(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    showAlert('Logo must be less than 2MB');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const preview = document.getElementById('logoPreview');
    preview.innerHTML = `<img src="${e.target.result}" alt="Logo preview"/>`;
  };
  reader.readAsDataURL(file);
}

// Click logo preview to trigger file input
document.getElementById('logoPreview').addEventListener('click', () => {
  document.getElementById('logoInput').click();
});

// ─── Alert Helpers ────────────────────────────────────────
function showAlert(message, type = 'error') {
  const box = type === 'error'
    ? document.getElementById('alertBox')
    : document.getElementById('successBox');

  box.textContent = message;
  box.classList.add('show');

  setTimeout(() => box.classList.remove('show'), 4000);
}

function setLoading(loading) {
  const btn = document.getElementById('submitBtn');
  if (loading) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Creating store...';
  } else {
    btn.disabled = false;
    btn.innerHTML = 'Create My Store 🚀';
  }
}

// ─── Form Submit ──────────────────────────────────────────
document.getElementById('onboardForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const businessName = document.getElementById('businessName').value.trim();
  const location = document.getElementById('location').value.trim();
  const phoneNumber = document.getElementById('phoneNumber').value.trim();
  const logoFile = document.getElementById('logoInput').files[0];

  setLoading(true);

  try {
    
    // Use FormData because we're uploading a file
    const formData = new FormData();
   const countrySelect = document.getElementById('country');
   const countryCode = countrySelect?.value || 'NG';
   const countryNames = {
  NG: 'Nigeria', US: 'United States',
  GB: 'United Kingdom', DE: 'Germany'
   };

formData.append('businessName', businessName);
formData.append('location', location);
formData.append('phoneNumber', phoneNumber);
formData.append('country', countryNames[countryCode] || 'Nigeria');
formData.append('countryCode', countryCode);
    if (logoFile) formData.append('logo', logoFile);

    // Special fetch for multipart form (file upload)
    const token = getToken();
    const response = await fetch(
      `${BASE_URL}/stores`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
          // DO NOT set Content-Type for FormData
        },
        body: formData
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to create store');
    }

    // Update step indicator
    document.getElementById('step-indicator-2').classList.remove('active');
    document.getElementById('step-indicator-2').classList.add('done');
    document.getElementById('step-indicator-3').classList.add('active');

    // Show success state
    const card = document.querySelector('.onboard-card');
   const storeUrl = `${window.location.origin}/pages/store/store.html?slug=${data.store.slug}`;

card.innerHTML = `
  <div class="success-state">
    <div class="success-icon">🎉</div>
    <h2>Your Store is Live!</h2>
    <p>Welcome to Supamart, <strong>${businessName}</strong></p>
    <p>Your unique store link:</p>
    <div class="store-url-box" id="storeUrlBox">
      🔗 ${storeUrl}
    </div>
    <div style="display:flex;gap:10px;margin-bottom:16px">
      <button
        class="btn btn-outline"
        style="flex:1"
        onclick="copyUrl('${storeUrl}')"
      >
        📋 Copy Link
      </button>
      
        href="${storeUrl}"
        target="_blank"
        class="btn btn-outline"
        style="flex:1;display:inline-flex;align-items:center;justify-content:center"
      >
        🌐 Preview Store
      </a>
    </div>
    <button
      class="btn btn-primary btn-full"
      onclick="window.location.href='/pages/seller/dashboard.html'"
    >
      Go to My Dashboard →
    </button>
  </div>
`;

  } catch (error) {
    showAlert(error.message || 'Something went wrong. Please try again.');
  } finally {
    setLoading(false);
  }
});

function copyUrl(url) {
  navigator.clipboard.writeText(url).then(() => {
    showAlert('Store URL copied to clipboard!', 'success');
  }).catch(() => {
    // Fallback for browsers that block clipboard
    const el = document.createElement('textarea');
    el.value = url;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    showAlert('Store URL copied!', 'success');
  });
}