requireAuth();
const user = getUser();
if (user?.role !== 'admin') {
  window.location.href = '../home/index.html';
}

// ─── Init ─────────────────────────────────────────────────
(async () => {
  await loadStats();
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
    overview: ['Overview', 'Platform statistics'],
    users: ['Users', 'Manage all users and sellers'],
    orders: ['Orders', 'View all platform orders'],
    escrow: ['Escrow', 'Manage held and disputed payments']
  };

  document.getElementById('dashTitle').textContent = titles[tab][0];
  document.getElementById('dashSubtitle').textContent = titles[tab][1];

  if (tab === 'users') loadUsers();
  if (tab === 'orders') loadOrders();
  if (tab === 'escrow') loadEscrow();
}

// ─── Stats ────────────────────────────────────────────────
async function loadStats() {
  try {
    const data = await apiRequest('/admin/stats');
    const s = data.stats;
    document.getElementById('statUsers').textContent = s.totalUsers;
    document.getElementById('statSellers').textContent = s.totalSellers;
    document.getElementById('statProducts').textContent = s.totalProducts;
    document.getElementById('statOrders').textContent = s.totalOrders;
    document.getElementById('statDisputes').textContent = s.disputedOrders;
    document.getElementById('statEscrow').textContent = s.heldEscrow;
  } catch (error) {
    showAlert('Failed to load stats');
  }
}

// ─── Users ────────────────────────────────────────────────
async function loadUsers() {
  const container = document.getElementById('usersList');
  try {
    const data = await apiRequest('/admin/users');
    const users = data.users;

    if (users.length === 0) {
      container.innerHTML = '<p class="empty-text">No users found</p>';
      return;
    }

    container.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Joined</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(u => `
            <tr>
              <td><strong>${u.name}</strong></td>
              <td>${u.email}</td>
              <td>
                <span class="role-badge role-${u.role}">${u.role}</span>
              </td>
              <td>
                <span class="status-badge ${u.isActive ? 'status-active' : 'status-banned'}">
                  ${u.isActive ? 'Active' : 'Banned'}
                </span>
              </td>
              <td>${new Date(u.createdAt).toLocaleDateString()}</td>
              <td>
                ${u.role !== 'admin' ? `
                  <button
                    class="btn-xs ${u.isActive ? 'btn-ban' : 'btn-unban'}"
                    onclick="toggleBan('${u._id}', ${u.isActive})"
                  >
                    ${u.isActive ? 'Ban' : 'Unban'}
                  </button>
                ` : '—'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (error) {
    container.innerHTML = '<p class="empty-text">Failed to load users</p>';
  }
}

async function toggleBan(userId, isCurrentlyActive) {
  const action = isCurrentlyActive ? 'ban' : 'unban';
  if (!confirm(`Are you sure you want to ${action} this user?`)) return;

  try {
    await apiRequest(`/admin/users/${userId}/ban`, 'PATCH');
    showAlert(
      `User ${action}ned successfully`,
      'success'
    );
    await loadUsers();
  } catch (error) {
    showAlert(error.message || 'Failed to update user');
  }
}

// ─── Orders ───────────────────────────────────────────────
async function loadOrders() {
  const container = document.getElementById('adminOrdersList');
  try {
    const data = await apiRequest('/admin/orders');
    const orders = data.orders;

    if (orders.length === 0) {
      container.innerHTML = '<p class="empty-text">No orders found</p>';
      return;
    }

    container.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Product</th>
            <th>Buyer</th>
            <th>Seller</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          ${orders.map(o => `
            <tr>
              <td><strong>#${o._id.slice(-6).toUpperCase()}</strong></td>
              <td>${o.productId?.name || '—'}</td>
              <td>${o.buyerId?.name || '—'}</td>
              <td>${o.sellerId?.name || '—'}</td>
              <td>
                ${CURRENCY_SYMBOLS[o.currency] || ''}
                ${o.amountPaid?.toFixed(2)} ${o.currency}
              </td>
              <td>
                <span class="order-status status-${o.status}">
                  ${o.status}
                </span>
              </td>
              <td>${new Date(o.createdAt).toLocaleDateString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (error) {
    container.innerHTML =
      '<p class="empty-text">Failed to load orders</p>';
  }
}

// ─── Escrow ───────────────────────────────────────────────
async function loadEscrow() {
  const container = document.getElementById('escrowList');
  try {
    const data = await apiRequest('/admin/escrow');
    const escrows = data.escrows;

    if (escrows.length === 0) {
      container.innerHTML =
        '<p class="empty-text">No escrow records found</p>';
      return;
    }

    container.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Product</th>
            <th>Buyer</th>
            <th>Seller</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${escrows.map(e => {
            const order = e.orderId;
            const canAct = e.status === 'held' || e.status === 'disputed';
            return `
              <tr>
                <td>
                  <strong>#${order?._id?.slice(-6).toUpperCase() || '—'}</strong>
                </td>
                <td>${order?.productId?.name || '—'}</td>
                <td>${order?.buyerId?.name || '—'}</td>
                <td>${order?.sellerId?.name || '—'}</td>
                <td>
                  ${CURRENCY_SYMBOLS[e.currency] || ''}
                  ${e.amountHeld?.toFixed(2)} ${e.currency}
                </td>
                <td>
                  <span class="status-badge status-${e.status}">
                    ${e.status}
                  </span>
                </td>
                <td>
                  ${canAct ? `
                    <div style="display:flex;gap:6px">
                      <button
                        class="btn-xs btn-release"
                        onclick="releaseEscrow('${e._id}')"
                      >
                        ✅ Release
                      </button>
                      <button
                        class="btn-xs btn-refund"
                        onclick="refundEscrow('${e._id}')"
                      >
                        ↩ Refund
                      </button>
                    </div>
                  ` : '—'}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  } catch (error) {
    container.innerHTML =
      '<p class="empty-text">Failed to load escrow records</p>';
  }
}

async function releaseEscrow(escrowId) {
  if (!confirm(
    'Release escrow to seller?\n\nThis will credit the seller wallet.'
  )) return;

  try {
    await apiRequest(`/admin/escrow/${escrowId}/release`, 'POST');
    showAlert('Escrow released to seller successfully', 'success');
    await loadEscrow();
    await loadStats();
  } catch (error) {
    showAlert(error.message || 'Failed to release escrow');
  }
}

async function refundEscrow(escrowId) {
  if (!confirm(
    'Refund buyer?\n\nThis will return funds to the buyer wallet.'
  )) return;

  try {
    await apiRequest(`/admin/escrow/${escrowId}/refund`, 'POST');
    showAlert('Buyer refunded successfully', 'success');
    await loadEscrow();
    await loadStats();
  } catch (error) {
    showAlert(error.message || 'Failed to refund buyer');
  }
}

// ─── Alert ────────────────────────────────────────────────
function showAlert(message, type = 'error') {
  const box = type === 'error'
    ? document.getElementById('alertBox')
    : document.getElementById('successBox');
  box.textContent = message;
  box.className = `alert alert-${type} show`;
  setTimeout(() => box.classList.remove('show'), 4000);
}