// ─── State ────────────────────────────────────────────────
let currentPage = 1;
let currentSearch = '';
let userCurrency = 'NGN';
let exchangeRates = {};
let searchTimer = null;

// ─── Init ─────────────────────────────────────────────────
(async () => {
  setupNavbar();
  await initCurrency();
  await loadProducts();
})();

// ─── Navbar Setup ─────────────────────────────────────────
function setupNavbar() {
  const user = getUser();
  if (!user) return;

  document.getElementById('navLogin').style.display = 'none';
  document.getElementById('navRegister').style.display = 'none';
  document.getElementById('navLogout').style.display = 'block';

  if (user.role === 'seller') {
    document.getElementById('navSell').style.display = 'block';
  } else if (user.role === 'buyer') {
    document.getElementById('navOrders').style.display = 'block';
  }
}

// ─── Currency Init ────────────────────────────────────────
async function initCurrency() {
  userCurrency = await getUserCurrency();
  exchangeRates = await getExchangeRates();
  const select = document.getElementById('currencySelect');
  if (select) select.value = userCurrency;
}

// ─── Switch Currency ──────────────────────────────────────
function switchCurrency(currency) {
  userCurrency = currency;
  localStorage.setItem('supamart_currency', currency);
  loadProducts(true);
}

// ─── Load Products ────────────────────────────────────────
async function loadProducts(reset = false) {
  if (reset) {
    currentPage = 1;
    document.getElementById('productGrid').innerHTML = `
      <div class="product-skeleton"></div>
      <div class="product-skeleton"></div>
      <div class="product-skeleton"></div>
      <div class="product-skeleton"></div>
    `;
  }

  try {
    const params = new URLSearchParams({
      page: currentPage,
      limit: 12,
      ...(currentSearch && { search: currentSearch })
    });

    const data = await apiRequest(`/products?${params}`);
    const { products, pagination } = data;

    if (currentPage === 1) {
      document.getElementById('productGrid').innerHTML = '';
    }

    const emptyState = document.getElementById('emptyState');
    const loadMoreWrapper = document.getElementById('loadMoreWrapper');
    const productCount = document.getElementById('productCount');

    if (products.length === 0 && currentPage === 1) {
      if (emptyState) emptyState.style.display = 'block';
      if (loadMoreWrapper) loadMoreWrapper.style.display = 'none';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    products.forEach(product => {
      const card = createProductCard(product);
      document.getElementById('productGrid').appendChild(card);
    });

    if (productCount) {
      productCount.textContent =
        `${pagination.total} product${pagination.total !== 1 ? 's' : ''} found`;
    }

    const hasMore = currentPage < pagination.pages;
    if (loadMoreWrapper) {
      loadMoreWrapper.style.display = hasMore ? 'block' : 'none';
    }

  } catch (error) {
    console.error('Load products error:', error);
    document.getElementById('productGrid').innerHTML = `
      <p style="color:var(--danger);grid-column:1/-1;
                text-align:center;padding:40px">
        Failed to load products. Please refresh the page.
      </p>
    `;
  }
}

// ─── Create Product Card ──────────────────────────────────
function createProductCard(product) {
  const card = document.createElement('div');
  card.className = 'product-card';

  const price = computeDisplayPrice(
    product.basePriceNGN,
    userCurrency,
    exchangeRates
  );
  const formattedPrice = formatPrice(price, userCurrency);

  const imageHTML = product.images && product.images.length > 0
    ? `<img class="product-image"
         src="${product.images[0]}"
         alt=""
         loading="lazy"
       />`
    : `<div class="product-image-placeholder">📦</div>`;

  const storeLogo = product.storeId?.logoUrl
    ? `<img class="store-logo-small"
         src="${product.storeId.logoUrl}" alt=""/>`
    : `<div class="store-logo-small"></div>`;

  card.innerHTML = `
    ${imageHTML}
    <div class="product-info">
      <div class="product-store">
        ${storeLogo}
        <span class="store-name">
          ${product.storeId?.businessName || 'Unknown Store'}
        </span>
      </div>
      <div class="product-name">${product.name}</div>
      <div class="product-price">${formattedPrice}</div>
      <div class="product-actions">
        <button class="btn btn-primary view-btn">View</button>
        <button class="btn btn-outline cart-btn">🛒 Add</button>
        <button class="btn btn-outline wa-btn">💬</button>
      </div>
    </div>
  `;

  card.querySelector('.view-btn').addEventListener('click', () => {
    window.location.href =
      `/pages/product/product.html?id=${product._id}`;
  });

  card.querySelector('.cart-btn').addEventListener('click', () => {
    const count = addToCart(
      product,
      product.storeId?.businessName,
      product.storeId?.slug,
      product.storeId?.phoneNumber
    );
    showCartToast(product.name, count);
  });

  card.querySelector('.wa-btn').addEventListener('click', () => {
    const phone = product.storeId?.phoneNumber;
    if (!phone) { alert('Seller contact not available'); return; }
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(
      `Hi! I'm interested in "${product.name}" from ` +
      `"${product.storeId?.businessName}" on Supamart.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  });
  return card;
}

// ─── Search ───────────────────────────────────────────────
function handleSearch(value) {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    currentSearch = value.trim();
    loadProducts(true);
  }, 500);
}

// ─── Load More ────────────────────────────────────────────
async function loadMore() {
  currentPage++;
  const btn = document.getElementById('loadMoreBtn');
  if (btn) {
    btn.textContent = 'Loading...';
    btn.disabled = true;
  }
  await loadProducts();
  if (btn) {
    btn.textContent = 'Load More Products';
    btn.disabled = false;
  }
}

// ─── Cart Toast Notification ──────────────────────────────
function showCartToast(productName, count) {
  const existing = document.getElementById('cartToast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'cartToast';
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: var(--secondary);
    color: white;
    padding: 14px 20px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 12px;
    animation: slideInRight 0.3s ease;
    max-width: 320px;
  `;

  toast.innerHTML = `
    <span>🛒</span>
    <div>
      <div>${productName} added to cart</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.7);margin-top:2px">
        ${count} item${count !== 1 ? 's' : ''} in cart
      </div>
    </div>
    <a href="/pages/cart/cart.html"
       style="background:var(--primary);color:white;padding:6px 14px;
              border-radius:8px;font-size:12px;text-decoration:none;
              white-space:nowrap">
      View Cart
    </a>
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}