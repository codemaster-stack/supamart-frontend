requireAuth();
const user = getUser();
if (user?.role !== 'seller') {
 window.location.href = '/pages/home/index.html';
}

let storeData = null;
let myProducts = [];
let editingProductId = null;

// ─── Init ─────────────────────────────────────────────────
(async () => {
  await loadStoreData();
  await loadOverviewStats();
})();

// ─── Load Store ───────────────────────────────────────────
async function loadStoreData() {
  try {
    const data = await apiRequest('/stores/my-store');
    storeData = data.store;

    document.getElementById('dashSubtitle').textContent =
      `Managing: ${storeData.businessName}`;
    document.getElementById('storeBadgeTop').textContent =
      storeData.businessName;

    document.getElementById('addProductBtn').style.display = 'block';

  } catch (error) {
    // No store yet
    if (error.message.includes('not created')) {
      window.location.href = '/pages/seller/onboarding.html';
    }
  }
}

// ─── Overview Stats ───────────────────────────────────────
async function loadOverviewStats() {
  try {
    // Load products
    const prodData = await apiRequest('/products/seller/my-products');
    myProducts = prodData.products;
    document.getElementById('totalProducts').textContent =
      myProducts.length;

    // Load orders
    const orderData = await apiRequest('/orders/seller');
    const orders = orderData.orders || [];
    document.getElementById('totalOrders').textContent = orders.length;
    document.getElementById('pendingOrders').textContent =
      orders.filter(o => o.status === 'pending' || o.status === 'paid').length;
    document.getElementById('completedOrders').textContent =
      orders.filter(o => o.status === 'completed').length;

    // Recent orders preview
    renderRecentOrders(orders.slice(0, 5));

  } catch (error) {
    console.error('Stats error:', error);
  }
}

// ─── Recent Orders Preview ────────────────────────────────
function renderRecentOrders(orders) {
  const container = document.getElementById('recentOrdersPreview');
  if (orders.length === 0) {
    container.innerHTML = '<p class="empty-text">No orders yet</p>';
    return;
  }
  container.innerHTML = orders.map(order => `
    <div class="order-row">
      <div class="order-info">
        <div class="order-id">Order #${order._id.slice(-6).toUpperCase()}</div>
        <div class="order-product">${order.productId?.name || 'Product'}</div>
        <div class="order-amount">
          ${CURRENCY_SYMBOLS[order.currency] || ''}${order.amountPaid?.toFixed(2)}
        </div>
      </div>
      <span class="order-status status-${order.status}">${order.status}</span>
    </div>
  `).join('');
}

// ─── Tab Navigation ───────────────────────────────────────
function showTab(tab) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(t =>
    t.classList.add('hidden')
  );

  // Remove active from all nav items
  document.querySelectorAll('.nav-item').forEach(n =>
    n.classList.remove('active')
  );

  // Show selected tab
  document.getElementById(`tab-${tab}`).classList.remove('hidden');

  // Tab titles
  const titles = {
    overview: ['Overview', `Managing: ${storeData?.businessName || ''}`],
    products: ['My Products', 'Manage your product listings'],
    orders: ['Orders', 'Track and manage your orders'],
    store: ['My Store', 'View and edit your store details']
  };

  document.getElementById('dashTitle').textContent = titles[tab][0];
  document.getElementById('dashSubtitle').textContent = titles[tab][1];

  // Load tab data
  if (tab === 'products') loadProductsTab();
  if (tab === 'orders') loadOrdersTab();
  if (tab === 'store') loadStoreTab();
}

// ─── Products Tab ─────────────────────────────────────────
async function loadProductsTab() {
  const container = document.getElementById('productsList');
  container.innerHTML = '<p class="empty-text">Loading...</p>';

  try {
    const data = await apiRequest('/products/seller/my-products');
    myProducts = data.products;

    if (myProducts.length === 0) {
      container.innerHTML =
        '<p class="empty-text">No products yet. Click "+ Add Product" to start.</p>';
      return;
    }

    container.innerHTML = myProducts.map(product => {
      const displayPrice = (product.basePriceNGN * 1.10).toLocaleString('en-NG', {
        style: 'currency', currency: 'NGN'
      });
      const imgHTML = product.images?.length > 0
        ? `<img class="product-row-img" src="${product.images[0]}" alt=""/>`
        : `<div class="product-row-img">📦</div>`;

      return `
        <div class="product-row">
          ${imgHTML}
          <div class="product-row-info">
            <div class="product-row-name">${product.name}</div>
            <div class="product-row-price">
              ${displayPrice}
              <small>(base: ₦${product.basePriceNGN.toLocaleString()})</small>
            </div>
          </div>
          <div class="product-row-actions">
            <button
              class="btn-sm btn-edit"
              onclick="openProductModal('${product._id}')"
            >
              ✏️ Edit
            </button>
            <button
              class="btn-sm btn-delete"
              onclick="deleteProduct('${product._id}')"
            >
              🗑 Delete
            </button>
          </div>
        </div>
      `;
    }).join('');

  } catch (error) {
    container.innerHTML =
      '<p class="empty-text">Failed to load products</p>';
  }
}

// ─── Orders Tab ───────────────────────────────────────────
async function loadOrdersTab() {
  const container = document.getElementById('ordersList');
  container.innerHTML = '<p class="empty-text">Loading...</p>';

  try {
    const data = await apiRequest('/orders/seller');
    const orders = data.orders || [];

    if (orders.length === 0) {
      container.innerHTML =
        '<p class="empty-text">No orders yet</p>';
      return;
    }

    container.innerHTML = orders.map(order => `
      <div class="order-row">
        <div class="order-info">
          <div class="order-id">
            Order #${order._id.slice(-6).toUpperCase()} ·
            ${new Date(order.createdAt).toLocaleDateString()}
          </div>
          <div class="order-product">${order.productId?.name || 'Product'}</div>
          <div class="order-amount">
            ${CURRENCY_SYMBOLS[order.currency] || ''}${order.amountPaid?.toFixed(2)}
            ${order.currency}
          </div>
        </div>
        <span class="order-status status-${order.status}">
          ${order.status}
        </span>
      </div>
    `).join('');

  } catch (error) {
    container.innerHTML =
      '<p class="empty-text">Failed to load orders</p>';
  }
}

// ─── Store Tab ────────────────────────────────────────────
function loadStoreTab() {
  const container = document.getElementById('storeInfo');
  if (!storeData) {
    container.innerHTML = '<p class="empty-text">Store not found</p>';
    return;
  }

  const storeUrl = `${window.location.origin}/pages/store/store.html?slug=${storeData.slug}`;

  container.innerHTML = `
    <div class="store-info-grid">
      <div class="info-item">
        <label>Business Name</label>
        <p>${storeData.businessName}</p>
      </div>
      <div class="info-item">
        <label>Location</label>
        <p>${storeData.location}</p>
      </div>
      <div class="info-item">
        <label>Phone / WhatsApp</label>
        <p>+${storeData.phoneNumber}</p>
      </div>
      <div class="info-item">
        <label>Store Created</label>
        <p>${new Date(storeData.createdAt).toLocaleDateString()}</p>
      </div>
      <div class="info-item" style="grid-column:1/-1">
        <label>Your Store URL</label>
        <div class="store-url-copy" onclick="copyStoreUrl('${storeUrl}')">
          🔗 ${storeUrl} &nbsp; <span style="color:var(--gray-400)">Click to copy</span>
        </div>
      </div>
    </div>
    <div style="padding:0 24px 24px">
      
        href="/page/store/store.html?slug=${storeData.slug}"
        class="btn btn-outline"
        target="_blank"
      >
        🌐 View Public Store Page
      </a>
    </div>
  `;
}

function copyStoreUrl(url) {
  navigator.clipboard.writeText(url).then(() => {
    showAlert('Store URL copied to clipboard!', 'success');
  });
}

// ─── Product Modal ────────────────────────────────────────
async function openProductModal(productId = null) {
  editingProductId = productId;
  document.getElementById('modalAlert').className = 'alert alert-error';
  document.getElementById('productForm').reset();
  document.getElementById('pricePreview').textContent = '0';

  if (productId) {
    // Edit mode
    document.getElementById('modalTitle').textContent = 'Edit Product';
    document.getElementById('saveProductBtn').textContent = 'Update Product';

    const product = myProducts.find(p => p._id === productId);
    if (product) {
      document.getElementById('productName').value = product.name;
      document.getElementById('productDesc').value = product.description;
      document.getElementById('productPrice').value = product.basePriceNGN;
      updatePricePreview(product.basePriceNGN);
    }
  } else {
    document.getElementById('modalTitle').textContent = 'Add New Product';
    document.getElementById('saveProductBtn').textContent = 'Save Product';
  }

  document.getElementById('productModal').classList.add('open');
}

function closeProductModal() {
  document.getElementById('productModal').classList.remove('open');
  editingProductId = null;
}

// Live price preview
document.getElementById('productPrice').addEventListener('input', (e) => {
  updatePricePreview(e.target.value);
});

function updatePricePreview(basePrice) {
  const preview = (Number(basePrice) * 1.10).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  document.getElementById('pricePreview').textContent = preview;
}

// ─── Save Product ─────────────────────────────────────────
document.getElementById('productForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('productName').value.trim();
  const description = document.getElementById('productDesc').value.trim();
  const basePriceNGN = document.getElementById('productPrice').value;
  const imageFiles = document.getElementById('productImages').files;

  const btn = document.getElementById('saveProductBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Saving...';

  try {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('basePriceNGN', basePriceNGN);
    for (let i = 0; i < imageFiles.length; i++) {
      formData.append('images', imageFiles[i]);
    }

    const token = getToken();
    const url = editingProductId
      ? `${BASE_URL}/products/${editingProductId}`
      : `${BASE_URL}/products`;
    const method = editingProductId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message);

    closeProductModal();
    showAlert(
      editingProductId
        ? 'Product updated successfully!'
        : 'Product added successfully!',
      'success'
    );

    await loadProductsTab();
    await loadOverviewStats();

  } catch (error) {
    const alertEl = document.getElementById('modalAlert');
    alertEl.textContent = error.message || 'Failed to save product';
    alertEl.className = 'alert alert-error show';
  } finally {
    btn.disabled = false;
    btn.textContent = editingProductId ? 'Update Product' : 'Save Product';
  }
});

// ─── Delete Product ───────────────────────────────────────
async function deleteProduct(productId) {
  if (!confirm('Are you sure you want to remove this product?')) return;

  try {
    await apiRequest(`/products/${productId}`, 'DELETE');
    showAlert('Product removed successfully', 'success');
    await loadProductsTab();
    await loadOverviewStats();
  } catch (error) {
    showAlert(error.message || 'Failed to delete product');
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

// Close modal on overlay click
document.getElementById('productModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('productModal')) {
    closeProductModal();
  }
});
