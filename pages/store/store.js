let storeData = null;
let userCurrency = 'NGN';
let exchangeRates = {};

// Setup navbar
const user = getUser();
if (user) {
  document.getElementById('navLogin').style.display = 'none';
  document.getElementById('navLogout').style.display = 'block';
}

// ─── Init ─────────────────────────────────────────────────
(async () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug');

    console.log('Store slug from URL:', slug);

    if (!slug) {
      console.error('No slug found in URL');
      window.location.href = '/pages/home/index.html';
      return;
    }

    userCurrency = await getUserCurrency();
    exchangeRates = await getExchangeRates();

    const currencySelect = document.getElementById('currencySelect');
    if (currencySelect) currencySelect.value = userCurrency;

    await loadStore(slug);

  } catch (err) {
    console.error('Store init error:', err);
  }
})();

// ─── Load Store ───────────────────────────────────────────
async function loadStore(slug) {
  try {
    console.log('Fetching store:', slug);
    const data = await apiRequest(`/stores/${slug}`);
    console.log('Store data:', data);

    if (!data || !data.store) {
      console.error('No store in response');
      return;
    }

    storeData = data.store;
    renderStoreHeader(storeData);
    await loadStoreProducts(storeData._id);

  } catch (error) {
    console.error('Load store error:', error.message);
  }
}

// ─── Render Store Header ──────────────────────────────────
function renderStoreHeader(store) {
  document.title = `${store.businessName} — Supamart`;

  const logoLarge = document.getElementById('storeLogoLarge');
  const logoPlaceholder = document.getElementById('storeLogoPlaceholder');

  if (store.logoUrl && logoLarge) {
    logoLarge.src = store.logoUrl;
    logoLarge.style.display = 'block';
    if (logoPlaceholder) logoPlaceholder.style.display = 'none';
  }

  const nameEl = document.getElementById('storeNameLarge');
  if (nameEl) nameEl.textContent = store.businessName;

  const locationEl = document.getElementById('storeLocation');
  if (locationEl) locationEl.textContent = `📍 ${store.location}`;
}

// ─── Load Store Products ──────────────────────────────────
async function loadStoreProducts(storeId) {
  const grid = document.getElementById('storeProductGrid');
  const emptyState = document.getElementById('emptyState');

  try {
    console.log('Fetching products for store:', storeId);
    const data = await apiRequest(`/products/store/${storeId}`);
    console.log('Store products:', data);

    if (!grid) return;
    grid.innerHTML = '';

    const products = data.products || [];

    if (products.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    products.forEach(product => {
      const price = computeDisplayPrice(
        product.basePriceNGN,
        userCurrency,
        exchangeRates
      );
      const formatted = formatPrice(price, userCurrency);

      const imgHTML = product.images?.length > 0
        ? `<img class="product-image"
             src="${product.images[0]}"
             alt=""
             loading="lazy"
           />`
        : `<div class="product-image-placeholder">📦</div>`;

      const card = document.createElement('div');
      card.className = 'product-card';
      card.innerHTML = `
        ${imgHTML}
        <div class="product-info">
          <div class="product-name">${product.name}</div>
          <div class="product-price">${formatted}</div>
          <div class="product-actions">
            <button class="btn btn-primary view-btn">View</button>
            <button class="btn-whatsapp-sm wa-btn">💬</button>
          </div>
        </div>
      `;

      // View button
      card.querySelector('.view-btn').addEventListener('click', () => {
        console.log('View product:', product._id);
        window.location.href =
          `/pages/product/product.html?id=${product._id}`;
      });

      // WhatsApp button
      card.querySelector('.wa-btn').addEventListener('click', () => {
        if (!storeData?.phoneNumber) {
          alert('Seller contact not available');
          return;
        }
        const phone = storeData.phoneNumber.replace(/\D/g, '');
        const msg = encodeURIComponent(
          `Hi! I'm interested in "${product.name}" from "${storeData.businessName}" on Supamart.`
        );
        window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
      });

      grid.appendChild(card);
    });

  } catch (error) {
    console.error('Load store products error:', error.message);
    if (grid) {
      grid.innerHTML = `
        <p style="color:var(--danger);padding:40px;
                  text-align:center;grid-column:1/-1">
          Failed to load products. Please refresh.
        </p>
      `;
    }
  }
}

// ─── Switch Currency ──────────────────────────────────────
function switchCurrency(currency) {
  userCurrency = currency;
  localStorage.setItem('supamart_currency', currency);
  if (storeData) loadStoreProducts(storeData._id);
}