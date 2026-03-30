requireAuth();
const user = getUser();
if (user?.role === 'admin') {
  window.location.href = '/pages/admin/admin.html';
}
if (user?.role === 'seller') {
 window.location.href = '/pages/seller/dashboard.html';
}

let allOrders = [];

// ─── Init ─────────────────────────────────────────────────
(async () => {
  await loadOrders();
})();

// ─── Tab Navigation ───────────────────────────────────────
function showTab(tab) {
  document.querySelectorAll('.tab-content').forEach(t =>
    t.classList.add('hidden')
  );
  document.querySelectorAll('.nav-item').forEach(n =>
    n.classList.remove('active')
  );
  document.getElementById(`tab-${tab}`).classList.remove('hidden');

  const titles = {
    orders: ['My Orders', 'Track and manage your purchases'],
    wallets: ['My Wallets', 'View and manage your balances'],
    profile: ['Profile', 'Your account information']
  };

  document.getElementById('dashTitle').textContent = titles[tab][0];
  document.getElementById('dashSubtitle').textContent = titles[tab][1];

  if (tab === 'wallets') loadWallets();
  if (tab === 'profile') loadProfile();
}

// ─── Load Orders ──────────────────────────────────────────
async function loadOrders() {
  try {
    const data = await apiRequest('/orders/buyer');
    allOrders = data.orders || [];

    // Stats
    document.getElementById('totalOrders').textContent = allOrders.length;
    document.getElementById('pendingOrders').textContent =
      allOrders.filter(o =>
        ['pending','paid','shipped'].includes(o.status)
      ).length;
    document.getElementById('completedOrders').textContent =
      allOrders.filter(o => o.status === 'completed').length;
    document.getElementById('disputedOrders').textContent =
      allOrders.filter(o => o.status === 'disputed').length;

    renderOrders(allOrders);

  } catch (error) {
    document.getElementById('ordersList').innerHTML =
      '<p class="empty-text">Failed to load orders</p>';
  }
}

// ─── Render Orders ────────────────────────────────────────
function renderOrders(orders) {
  const container = document.getElementById('ordersList');

  if (orders.length === 0) {
    container.innerHTML = `
      <div class="empty-text">
        <p>No orders yet.</p>
        <a href="/page/home/index.html"
           style="color:var(--primary);font-weight:600">
          Start Shopping →
        </a>
      </div>
    `;
    return;
  }

  container.innerHTML = orders.map(order => {
    const product = order.productId;
    const imgHTML = product?.images?.length > 0
      ? `<img class="order-img" src="${product.images[0]}" alt=""/>`
      : `<div class="order-img">📦</div>`;

    const actionBtns = getOrderActions(order);

    return `
      <div class="order-row">
        ${imgHTML}
        <div class="order-info">
          <div class="order-id">
            #${order._id.slice(-6).toUpperCase()} ·
            ${new Date(order.createdAt).toLocaleDateString()}
          </div>
          <div class="order-product">
            ${product?.name || 'Product'}
          </div>
          <div class="order-amount">
            ${CURRENCY_SYMBOLS[order.currency] || ''}
            ${order.amountPaid?.toFixed(2)} ${order.currency}
          </div>
        </div>
        <div class="order-right">
          <span class="order-status status-${order.status}">
            ${order.status}
          </span>
          <div style="display:flex;gap:6px">
            <button
              class="btn-sm btn-detail"
              onclick="viewOrderDetail('${order._id}')"
            >
              Details
            </button>
            ${actionBtns}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ─── Order Action Buttons ─────────────────────────────────
function getOrderActions(order) {
  if (order.status === 'shipped' || order.status === 'paid') {
    return `
      <button
        class="btn-sm btn-confirm"
        onclick="confirmDelivery('${order._id}')"
      >
        ✅ Confirm
      </button>
      <button
        class="btn-sm btn-dispute"
        onclick="raiseDispute('${order._id}')"
      >
        ⚠️ Dispute
      </button>
    `;
  }
  return '';
}

// ─── Confirm Delivery ─────────────────────────────────────
async function confirmDelivery(orderId) {
  if (!confirm(
    'Confirm you have received this order?\n\nThis will release payment to the seller.'
  )) return;

  try {
    await apiRequest(`/orders/${orderId}/confirm-delivery`, 'PATCH');
    showAlert('Delivery confirmed! Payment released to seller.', 'success');
    await loadOrders();
  } catch (error) {
    showAlert(error.message || 'Failed to confirm delivery');
  }
}

// ─── Raise Dispute ────────────────────────────────────────
async function raiseDispute(orderId) {
  const reason = prompt(
    'Please describe the issue with your order:\n\n' +
    'Examples:\n' +
    '- Item not received\n' +
    '- Wrong item delivered\n' +
    '- Item damaged\n' +
    '- Item not as described'
  );

  if (!reason || reason.trim() === '') {
    showAlert('Please provide a reason for the dispute');
    return;
  }

  try {
    await apiRequest(`/orders/${orderId}/dispute`, 'PATCH', {
      reason: reason.trim()
    });
    showAlert(
      'Dispute raised. Admin will review within 24 hours.',
      'success'
    );
    await loadOrders();
  } catch (error) {
    showAlert(error.message || 'Failed to raise dispute');
  }
}

// ─── View Order Detail ────────────────────────────────────
async function viewOrderDetail(orderId) {
  try {
    const data = await apiRequest(`/orders/${orderId}`);
    const { order, escrow } = data;

    const product = order.productId;
    const imgHTML = product?.images?.length > 0
      ? `<img
          src="${product.images[0]}"
          style="width:100%;height:200px;object-fit:cover;
                 border-radius:var(--radius);margin-bottom:16px"
          alt=""
        />`
      : '';

    document.getElementById('orderModalContent').innerHTML = `
      ${imgHTML}
      <div class="order-detail-row">
        <span>Order ID</span>
        <span>#${order._id.slice(-6).toUpperCase()}</span>
      </div>
      <div class="order-detail-row">
        <span>Product</span>
        <span>${product?.name || '—'}</span>
      </div>
      <div class="order-detail-row">
        <span>Quantity</span>
        <span>${order.quantity}</span>
      </div>
      <div class="order-detail-row">
        <span>Amount Paid</span>
        <span>
          ${CURRENCY_SYMBOLS[order.currency] || ''}
          ${order.amountPaid?.toFixed(2)} ${order.currency}
        </span>
      </div>
      <div class="order-detail-row">
        <span>Status</span>
        <span class="order-status status-${order.status}">
          ${order.status}
        </span>
      </div>
      <div class="order-detail-row">
        <span>Escrow</span>
        <span class="order-status status-${escrow?.status || 'pending'}">
          ${escrow?.status || 'N/A'}
        </span>
      </div>
      <div class="order-detail-row">
        <span>Date</span>
        <span>${new Date(order.createdAt).toLocaleString()}</span>
      </div>
      <div class="order-detail-actions">
        ${getOrderActions(order)}
      </div>
    `;

    document.getElementById('orderModal').classList.add('open');

  } catch (error) {
    showAlert('Failed to load order details');
  }
}

function closeOrderModal() {
  document.getElementById('orderModal').classList.remove('open');
}

// ─── Load Wallets ─────────────────────────────────────────
async function loadWallets() {
  const container = document.getElementById('walletsGrid');

  try {
    const data = await apiRequest('/wallets');
    const wallets = data.wallets;

    const icons = {
      NGN: '🇳🇬', USD: '🇺🇸', GBP: '🇬🇧', EUR: '🇪🇺'
    };

    container.innerHTML = wallets.map(w => `
      <div class="wallet-card ${w.currency.toLowerCase()}">
        <div class="wallet-currency-icon">${icons[w.currency]}</div>
        <div class="wallet-currency">${w.currency}</div>
        <div class="wallet-balance">
          ${formatPrice(w.balance, w.currency)}
        </div>
      </div>
    `).join('');

  } catch (error) {
    container.innerHTML =
      '<p class="empty-text">Failed to load wallets</p>';
  }
}

// ─── Fund Wallet ──────────────────────────────────────────
async function fundWallet() {
  const currency = document.getElementById('fundCurrency').value;
  const amount = document.getElementById('fundAmount').value;

  if (!amount || amount < 100) {
    return showAlert('Minimum funding amount is ₦100');
  }

  const btn = event.target;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Initializing...';

  try {
    const data = await apiRequest('/wallets/fund-initialize', 'POST', {
      currency,
      amount: Number(amount)
    });

    // Redirect to Paystack
    window.location.href = data.authorizationUrl;

  } catch (error) {
    showAlert(error.message || 'Failed to initialize wallet funding');
    btn.disabled = false;
    btn.innerHTML = '💳 Fund via Card';
  }
}

// ─── Load Profile ─────────────────────────────────────────
async function loadProfile() {
  try {
    const data = await apiRequest('/auth/me');
    const u = data.user;

    document.getElementById('profileContent').innerHTML = `
      <div class="profile-grid">
        <div class="profile-item">
          <label>Full Name</label>
          <p>${u.name}</p>
        </div>
        <div class="profile-item">
          <label>Email</label>
          <p>${u.email}</p>
        </div>
        <div class="profile-item">
          <label>Account Role</label>
          <p style="text-transform:capitalize">${u.role}</p>
        </div>
        <div class="profile-item">
          <label>Currency Preference</label>
          <p>${u.currencyPreference}</p>
        </div>
        <div class="profile-item">
          <label>Member Since</label>
          <p>${new Date(u.createdAt).toLocaleDateString('en-NG', {
            year:'numeric', month:'long', day:'numeric'
          })}</p>
        </div>
        <div class="profile-item">
          <label>Account Status</label>
          <p style="color:var(--success)">● Active</p>
        </div>
      </div>
    `;
  } catch (error) {
    document.getElementById('profileContent').innerHTML =
      '<p class="empty-text">Failed to load profile</p>';
  }
}

// ─── Alert Helpers ────────────────────────────────────────
function showAlert(message, type = 'error') {
  const box = type === 'error'
    ? document.getElementById('alertBox')
    : document.getElementById('successBox');
  box.textContent = message;
  box.className = `alert alert-${type} show`;
  setTimeout(() => box.classList.remove('show'), 4000);
}

document.getElementById('orderModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('orderModal')) {
    closeOrderModal();
  }
});