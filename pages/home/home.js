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
        <button class="btn btn-outline wa-btn">💬</button>
      </div>
    </div>
  `;

  // View button — safe event listener
  card.querySelector('.view-btn').addEventListener('click', () => {
    window.location.href =
      `/pages/product/product.html?id=${product._id}`;
  });

  // WhatsApp button — safe event listener
  card.querySelector('.wa-btn').addEventListener('click', () => {
    const phone = product.storeId?.phoneNumber;
    if (!phone) {
      alert('Seller contact not available');
      return;
    }
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