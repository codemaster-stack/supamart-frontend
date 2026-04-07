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
    escrow: ['Escrow', 'Manage held and disputed payments'],
    disputes: ['Disputes', 'Review and resolve disputes'],
    wallets: ['Wallets', 'Platform wallet overview']
  };

  document.getElementById('dashTitle').textContent = titles[tab][0];
  document.getElementById('dashSubtitle').textContent = titles[tab][1];

  if (tab === 'users') loadUsers();
  if (tab === 'orders') loadOrders();
  if (tab === 'escrow') loadEscrow();
  if (tab === 'disputes') loadDisputes();
  if (tab === 'wallets') loadAdminWallets();
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

    // Show platform earnings if available
    if (s.platformEarnings) {
      const earningsEl = document.getElementById('statEarnings');
      if (earningsEl) {
        earningsEl.textContent =
          `₦${s.platformEarnings.NGN?.toFixed(2) || '0.00'}`;
      }
    }
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
    <div style="display:flex;gap:6px">
      <button
        class="btn-xs ${u.isActive ? 'btn-ban' : 'btn-unban'}"
        onclick="toggleBan('${u._id}', ${u.isActive})"
      >
        ${u.isActive ? '🚫 Ban' : '✅ Unban'}
      </button>
      <button
        class="btn-xs btn-delete-user"
        onclick="deleteUser('${u._id}', '${u.name}')"
      >
        🗑 Delete
      </button>
    </div>
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

async function deleteUser(userId, userName) {
  if (!confirm(
    `⚠️ PERMANENTLY DELETE "${userName}"?\n\n` +
    `This will also delete:\n` +
    `• Their store\n` +
    `• Their wallets\n` +
    `• Their products (deactivated)\n\n` +
    `This action CANNOT be undone.`
  )) return;

  // Double confirm for safety
  const typed = prompt(
    `Type DELETE to confirm permanently deleting "${userName}":`
  );

  if (typed !== 'DELETE') {
    showAlert('Deletion cancelled — you must type DELETE to confirm');
    return;
  }

  try {
    await apiRequest(`/admin/users/${userId}`, 'DELETE');
    showAlert(`User "${userName}" deleted successfully`, 'success');
    await loadUsers();
    await loadStats();
  } catch (error) {
    showAlert(error.message || 'Failed to delete user');
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

    // ─── Disputes ─────────────────────────────────────────────
async function loadDisputes() {
  const container = document.getElementById('disputesList');
  try {
    const data = await apiRequest('/admin/disputes');
    const disputes = data.disputes;

    if (disputes.length === 0) {
      container.innerHTML =
        '<p class="empty-text">No disputes found ✅</p>';
      return;
    }

    container.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Raised By</th>
            <th>Reason</th>
            <th>Status</th>
            <th>Date</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${disputes.map(d => `
            <tr>
              <td>
                <strong>
                  #${d.orderId?._id?.slice(-6).toUpperCase() || '—'}
                </strong>
              </td>
              <td>${d.raisedBy?.name || '—'}</td>
              <td style="max-width:200px;overflow:hidden;
                         text-overflow:ellipsis;white-space:nowrap">
                ${d.reason}
              </td>
              <td>
                <span class="status-badge status-${d.status
                  .replace('_', '-')}">
                  ${d.status.replace(/_/g, ' ')}
                </span>
              </td>
              <td>${new Date(d.createdAt).toLocaleDateString()}</td>
              <td>
                <button
                  class="btn-xs btn-release"
                  onclick="openDisputeModal('${d._id}')"
                >
                  📋 Review
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (error) {
    container.innerHTML =
      '<p class="empty-text">Failed to load disputes</p>';
  }
}

// ─── Open Dispute Modal ───────────────────────────────────
async function openDisputeModal(disputeId) {
  document.getElementById('disputeModalContent').innerHTML =
    '<p style="text-align:center;padding:20px">Loading...</p>';
  document.getElementById('disputeModal').classList.add('open');

  try {
    const data = await apiRequest(`/admin/disputes/${disputeId}`);
    const d = data.dispute;
    const order = d.orderId;
    const isResolved = d.status.startsWith('resolved');

    document.getElementById('disputeModalContent').innerHTML = `

      <!-- Order Info -->
      <div style="background:var(--gray-50);border-radius:var(--radius-sm);
                  padding:16px;margin-bottom:20px;
                  border:1px solid var(--gray-200)">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <div style="font-size:11px;color:var(--gray-400);
                        font-weight:700;text-transform:uppercase;
                        margin-bottom:4px">Order</div>
            <div style="font-weight:700">
              #${order?._id?.slice(-6).toUpperCase() || '—'}
            </div>
          </div>
          <div>
            <div style="font-size:11px;color:var(--gray-400);
                        font-weight:700;text-transform:uppercase;
                        margin-bottom:4px">Product</div>
            <div style="font-weight:700">
              ${order?.productId?.name || '—'}
            </div>
          </div>
          <div>
            <div style="font-size:11px;color:var(--gray-400);
                        font-weight:700;text-transform:uppercase;
                        margin-bottom:4px">Buyer</div>
            <div>${order?.buyerId?.name || '—'}</div>
          </div>
          <div>
            <div style="font-size:11px;color:var(--gray-400);
                        font-weight:700;text-transform:uppercase;
                        margin-bottom:4px">Seller</div>
            <div>${order?.sellerId?.name || '—'}</div>
          </div>
          <div>
            <div style="font-size:11px;color:var(--gray-400);
                        font-weight:700;text-transform:uppercase;
                        margin-bottom:4px">Amount</div>
            <div style="font-weight:700;color:var(--primary)">
              ${CURRENCY_SYMBOLS[order?.currency] || ''}
              ${order?.amountPaid?.toFixed(2)} ${order?.currency || ''}
            </div>
          </div>
          <div>
            <div style="font-size:11px;color:var(--gray-400);
                        font-weight:700;text-transform:uppercase;
                        margin-bottom:4px">Status</div>
            <span class="status-badge status-${d.status}">
              ${d.status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
      </div>

      <!-- Dispute Reason -->
      <div style="margin-bottom:20px">
        <div style="font-size:13px;font-weight:700;color:var(--gray-700);
                    margin-bottom:8px">Dispute Reason</div>
        <div style="background:#fef9c3;padding:12px 16px;
                    border-radius:var(--radius-sm);
                    border:1px solid #fef08a;
                    font-size:14px;color:#854d0e">
          ${d.reason}
        </div>
      </div>

      <!-- Message Thread -->
      <div style="margin-bottom:20px">
        <div style="font-size:13px;font-weight:700;color:var(--gray-700);
                    margin-bottom:12px">
          Messages (${d.messages.length})
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;
                    max-height:200px;overflow-y:auto;
                    padding:4px">
          ${d.messages.map(m => `
            <div style="display:flex;gap:10px;
                        ${m.senderRole === 'admin'
                          ? 'flex-direction:row-reverse'
                          : ''}">
              <div style="width:32px;height:32px;border-radius:50%;
                          background:${m.senderRole === 'admin'
                            ? 'var(--primary)'
                            : m.senderRole === 'buyer'
                              ? '#3b82f6'
                              : '#22c55e'};
                          display:flex;align-items:center;
                          justify-content:center;
                          color:white;font-size:12px;
                          font-weight:700;flex-shrink:0">
                ${m.senderName?.charAt(0).toUpperCase() || '?'}
              </div>
              <div style="max-width:80%">
                <div style="font-size:11px;color:var(--gray-400);
                            margin-bottom:4px;
                            ${m.senderRole === 'admin'
                              ? 'text-align:right'
                              : ''}">
                  ${m.senderName} · ${m.senderRole} ·
                  ${new Date(m.createdAt).toLocaleString()}
                </div>
                <div style="background:${m.senderRole === 'admin'
                              ? 'var(--primary-light)'
                              : 'var(--gray-100)'};
                            padding:10px 14px;border-radius:10px;
                            font-size:14px;color:var(--gray-800)">
                  ${m.message}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      ${!isResolved ? `
        <!-- Admin Reply -->
        <div style="margin-bottom:20px">
          <div style="font-size:13px;font-weight:700;
                      color:var(--gray-700);margin-bottom:8px">
            Send Message to Parties
          </div>
          <textarea
            id="disputeMessage"
            rows="3"
            placeholder="Type your message to buyer and seller..."
            style="width:100%;padding:12px;border:2px solid var(--gray-200);
                   border-radius:var(--radius-sm);font-size:14px;
                   font-family:var(--font-main);resize:vertical"
          ></textarea>
          <button
            class="btn btn-outline"
            style="margin-top:8px;width:100%"
            onclick="sendDisputeMessage('${d._id}')"
          >
            📨 Send Message
          </button>
        </div>

        <!-- Resolution -->
        <div style="border-top:1px solid var(--gray-100);padding-top:20px">
          <div style="font-size:13px;font-weight:700;
                      color:var(--gray-700);margin-bottom:12px">
            Resolve Dispute
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <button
              class="btn btn-primary"
              onclick="resolveDispute('${d._id}', 'seller')"
            >
              ✅ Release to Seller
            </button>
            <button
              class="btn"
              style="background:#fef9c3;color:#854d0e;font-weight:700"
              onclick="resolveDispute('${d._id}', 'buyer')"
            >
              ↩ Refund Buyer
            </button>
          </div>
        </div>
      ` : `
        <div style="text-align:center;padding:20px;
                    background:var(--gray-50);border-radius:var(--radius-sm)">
          <div style="font-size:32px;margin-bottom:8px">✅</div>
          <div style="font-weight:700;color:var(--gray-700)">
            Dispute Resolved
          </div>
          <div style="font-size:13px;color:var(--gray-400);margin-top:4px">
            ${d.status === 'resolved_seller'
              ? 'Funds released to seller'
              : 'Buyer was refunded'}
          </div>
        </div>
      `}
    `;

  } catch (error) {
    document.getElementById('disputeModalContent').innerHTML =
      '<p style="color:var(--danger);text-align:center">Failed to load dispute</p>';
  }
}

function closeDisputeModal() {
  document.getElementById('disputeModal').classList.remove('open');
}

// ─── Send Dispute Message ─────────────────────────────────
async function sendDisputeMessage(disputeId) {
  const message = document.getElementById('disputeMessage').value.trim();
  if (!message) {
    showAlert('Please type a message');
    return;
  }

  try {
    await apiRequest(`/admin/disputes/${disputeId}/message`, 'POST', {
      message
    });
    showAlert('Message sent to buyer and seller', 'success');
    await openDisputeModal(disputeId);
  } catch (error) {
    showAlert(error.message || 'Failed to send message');
  }
}

// ─── Resolve Dispute ──────────────────────────────────────
async function resolveDispute(disputeId, resolution) {
  const label = resolution === 'seller'
    ? 'release funds to seller'
    : 'refund the buyer';

  if (!confirm(`Are you sure you want to ${label}?`)) return;

  try {
    await apiRequest(`/admin/disputes/${disputeId}/resolve`, 'POST', {
      resolution
    });
    showAlert('Dispute resolved successfully', 'success');
    closeDisputeModal();
    await loadDisputes();
    await loadStats();
  } catch (error) {
    showAlert(error.message || 'Failed to resolve dispute');
  }
}

// Close dispute modal on overlay click
document.getElementById('disputeModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('disputeModal')) {
    closeDisputeModal();
  }
});

       // ─── Admin Wallets ────────────────────────────────────────
async function loadAdminWallets() {
  const container = document.getElementById('adminWalletsList');
  try {
    const data = await apiRequest('/admin/wallets');
    const wallets = data.wallets;

    if (wallets.length === 0) {
      container.innerHTML =
        '<p class="empty-text">No wallet records found</p>';
      return;
    }

    container.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Role</th>
            <th>NGN</th>
            <th>USD</th>
            <th>GBP</th>
            <th>EUR</th>
          </tr>
        </thead>
        <tbody>
          ${wallets.map(w => `
            <tr>
              <td><strong>${w.userName}</strong><br>
                <span style="font-size:12px;color:var(--gray-400)">
                  ${w.userEmail}
                </span>
              </td>
              <td>
                <span class="role-badge role-${w.userRole}">
                  ${w.userRole}
                </span>
              </td>
              <td>₦${w.NGN?.toFixed(2) || '0.00'}</td>
              <td>$${w.USD?.toFixed(2) || '0.00'}</td>
              <td>£${w.GBP?.toFixed(2) || '0.00'}</td>
              <td>€${w.EUR?.toFixed(2) || '0.00'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (error) {
    container.innerHTML =
      '<p class="empty-text">Failed to load wallets</p>';
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