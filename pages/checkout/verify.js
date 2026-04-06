const user = getUser();
const token = getToken();

if (!token || !user) {
  window.location.href = '/pages/auth/login.html';
}

// Get reference from URL
const params = new URLSearchParams(window.location.search);
const reference = params.get('reference');

console.log('Verifying payment reference:', reference);

if (!reference) {
  showResult('error', 'No payment reference found');
} else {
  verifyPayment();
}

async function verifyPayment() {
  try {
    const data = await apiRequest('/payments/verify', 'POST', {
      reference
    });

    showResult('success', data.message, data.order);

  } catch (error) {
    console.error('Verify error:', error);
    showResult('error', error.message || 'Payment verification failed');
  }
}

function showResult(type, message, order = null) {
  const container = document.getElementById('verifyContent');

  if (type === 'success') {
    container.innerHTML = `
      <div style="font-size:64px;margin-bottom:16px">🎉</div>
      <h2 style="font-size:22px;font-weight:800;color:var(--gray-900);
                 margin-bottom:8px">
        Payment Successful!
      </h2>
      <p style="color:var(--gray-500);font-size:14px;margin-bottom:8px">
        ${message}
      </p>
      ${order ? `
        <div style="background:var(--gray-50);border-radius:12px;
                    padding:16px;margin:16px 0;text-align:left">
          <div style="font-size:13px;color:var(--gray-500);margin-bottom:4px">
            Order ID
          </div>
          <div style="font-weight:700;color:var(--gray-900)">
            #${order._id.slice(-6).toUpperCase()}
          </div>
        </div>
      ` : ''}
      <p style="color:var(--gray-400);font-size:13px;margin-bottom:8px">
        Your payment is held in escrow until delivery
      </p>
      <p style="color:var(--primary);font-size:13px;
                font-weight:600;margin-bottom:24px">
        Redirecting to your orders in
        <span id="countdown">5</span> seconds...
      </p>
      
        href="/pages/buyer/dashboard.html"
        class="btn btn-primary btn-full"
      >
        View My Orders →
      </a>
      
        href="/pages/home/index.html"
        class="btn btn-outline btn-full"
        style="margin-top:10px"
      >
        Continue Shopping
      </a>
    `;

    // Auto countdown redirect
    let seconds = 5;
    const countdownEl = document.getElementById('countdown');
    const timer = setInterval(() => {
      seconds--;
      if (countdownEl) countdownEl.textContent = seconds;
      if (seconds <= 0) {
        clearInterval(timer);
        window.location.href = '/pages/buyer/dashboard.html';
      }
    }, 1000);
  } else {
    container.innerHTML = `
      <div style="font-size:64px;margin-bottom:16px">❌</div>
      <h2 style="font-size:22px;font-weight:800;color:var(--gray-900);
                 margin-bottom:8px">
        Payment Failed
      </h2>
      <p style="color:var(--danger);font-size:14px;margin-bottom:24px">
        ${message}
      </p>
      
        href="/pages/home/index.html"
        class="btn btn-primary btn-full"
      >
        ← Back to Home
      </a>
      
        href="/pages/buyer/dashboard.html"
        class="btn btn-outline btn-full"
        style="margin-top:10px"
      >
        View My Orders
      </a>
    `;
  }
}