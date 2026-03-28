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

  // Set currency dropdown
  const select = document.getElementById('currencySelect');
  if (select) select.value = userCurrency;
}

// Switch currency manually
function switchCurrency(currency) {
  userCurrency = currency;
  localStorage.setItem('supamart_currency', currency);
  loadProducts(true); // reload with new currency
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

    // Clear skeletons on first load
    if (currentPage === 1) {
      document.getElementById('productGrid').innerHTML = '';
    }

    if (products.length === 0 && currentPage === 1) {
      document.getElementById('emptyState').style.display = 'block';
      document.getElementById('loadMoreWrapper').style.display = 'none';
      return;
    }

    document.getElementById('emptyState').style.display = 'none';

    // Render products
    products.forEach(product => {
      const card = createProductCard(product);
      document.getElementById('productGrid').appendChild(card);
    });

    // Update count
    document.getElementById('productCount').textContent =
      `${pagination.total} product${pagination.total !== 1 ? 's' : ''} found`;

    // Show/hide load more
    const hasMore = currentPage < pagination.pages;
    document.getElementById('loadMoreWrapper').style.display =
      hasMore ? 'block' : 'none';

  } catch (error) {
    document.getElementById('productGrid').innerHTML = `
      <p style="color:var(--danger);grid-column:1/-1;text-align:center;padding:40px">
        Failed to load products. Please refresh the page.
      </p>
    `;
  }
}

// ─── Create Product Card ──────────────────────────────────
function createProductCard(product) {
  const card = document.createElement('div');
  card.className = 'product-card';

  // Compute price
  const price = computeDisplayPrice(
    product.basePriceNGN,
    userCurrency,
    exchangeRates
  );
  const formattedPrice = formatPrice(price, userCurrency);

  // Image
  const imageHTML = product.images && product.images.length > 0
    ? `<img
        class="product-image"
        src="${product.images[0]}"
        alt="${product.name}"
        loading="lazy"
        onerror="this.parentElement.innerHTML='<div class=\'product-image-placeholder\'>📦</div>'"
      />`
    : `<div class="product-image-placeholder">📦</div>`;

  // Store logo
  const storeLogo = product.storeId?.logoUrl
    ? `<img class="store-logo-small" src="${product.storeId.logoUrl}" alt=""/>`
    : `<div class="store-logo-small"></div>`;

  card.innerHTML = `
    ${imageHTML}
    <div class="product-info">
      <div class="product-store">
        ${storeLogo}
        <span class="store-name">${product.storeId?.businessName || 'Unknown Store'}</span>
      </div>
      <div class="product-name">${product.name}</div>
      <div class="product-price">${formattedPrice}</div>
      <div class="product-actions">
        <button
          class="btn btn-primary"
          onclick="viewProduct('${product._id}')"
        >
          View
        </button>
        <button
          class="btn btn-outline"
          onclick="contactSeller('${product.storeId?.phoneNumber}', '${product.name}', '${product.storeId?.businessName}')"
        >
          💬
        </button>
      </div>
    </div>
  `;

  return card;
}

// ─── Actions ──────────────────────────────────────────────
function viewProduct(productId) {
  window.location.href = `/pages/product/product.html?id=${productId}`;
}

function contactSeller(phone, productName, storeName) {
  if (!phone) return alert('Seller contact not available');
  const message = encodeURIComponent(
    `Hi! I'm interested in "${productName}" from your store "${storeName}" on Supamart.`
  );
  window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
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
  btn.textContent = 'Loading...';
  btn.disabled = true;
  await loadProducts();
  btn.textContent = 'Load More Products';
  btn.disabled = false;
}
