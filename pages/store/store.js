let storeData = null;
let userCurrency = 'NGN';
let exchangeRates = {};

const user = getUser();
if (user) {
  document.getElementById('navLogin').style.display = 'none';
  document.getElementById('navLogout').style.display = 'block';
}

(async () => {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');
  if (!slug) {
   window.location.href = '/pages/home/index.html';
    return;
  }

  userCurrency = await getUserCurrency();
  exchangeRates = await getExchangeRates();
  document.getElementById('currencySelect').value = userCurrency;

  await loadStore(slug);
})();

async function loadStore(slug) {
  try {
    const data = await apiRequest(`/stores/${slug}`);
    storeData = data.store;
    renderStoreHeader(storeData);
    await loadStoreProducts(storeData._id);
  } catch (error) {
    window.location.href = '/pages/home/index.html';
  }
}

function renderStoreHeader(store) {
  document.title = `${store.businessName} — Supamart`;

  if (store.logoUrl) {
    document.getElementById('storeLogoLarge').src = store.logoUrl;
    document.getElementById('storeLogoLarge').style.display = 'block';
    document.getElementById('storeLogoPlaceholder').style.display = 'none';
  }

  document.getElementById('storeNameLarge').textContent = store.businessName;
  document.getElementById('storeLocation').textContent =
    `📍 ${store.location}`;

 document.getElementById('whatsappStoreBtn').onclick = () => {
  const phone = store.phoneNumber.replace(/\D/g, '');
  const msg = encodeURIComponent(
    `Hi ${store.businessName}! I found your store on Supamart and I'd like to make an enquiry. Please share your available products and prices.`
  );
  window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
};
}

async function loadStoreProducts(storeId) {
  try {
    const data = await apiRequest(`/products/store/${storeId}`);
    const products = data.products;

    const grid = document.getElementById('storeProductGrid');
    grid.innerHTML = '';

    if (products.length === 0) {
      document.getElementById('emptyState').style.display = 'block';
      return;
    }

   products.forEach(product => {
  const price = computeDisplayPrice(
    product.basePriceNGN, userCurrency, exchangeRates
  );
  const formatted = formatPrice(price, userCurrency);

  const imgHTML = product.images?.length > 0
    ? `<img class="product-image" src="${product.images[0]}" alt="${product.name}" loading="lazy"/>`
    : `<div class="product-image-placeholder">📦</div>`;

  const card = document.createElement('div');
  card.className = 'product-card';
  card.innerHTML = `
    ${imgHTML}
    <div class="product-info">
      <div class="product-name">${product.name}</div>
      <div class="product-price">${formatted}</div>
      <div class="product-actions">
        <button class="btn btn-primary" id="view-${product._id}">
          View
        </button>
        <button class="btn-whatsapp-sm" id="wa-${product._id}">
          💬
        </button>
      </div>
    </div>
  `;

  // Attach events safely
  card.querySelector(`#view-${product._id}`).addEventListener('click', () => {
    window.location.href = `/pages/product/product.html?id=${product._id}`;
  });

  card.querySelector(`#wa-${product._id}`).addEventListener('click', () => {
    const phone = storeData.phoneNumber.replace(/\D/g, '');
    const msg = encodeURIComponent(
      `Hi! I'm interested in "${product.name}" from your store "${storeData.businessName}" on Supamart.`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  });

  grid.appendChild(card);
});

  } catch (error) {
    document.getElementById('storeProductGrid').innerHTML =
      '<p style="color:var(--danger);padding:40px;text-align:center">Failed to load products</p>';
  }
}

function switchCurrency(currency) {
  userCurrency = currency;
  localStorage.setItem('supamart_currency', currency);
  if (storeData) loadStoreProducts(storeData._id);
}

function contactSeller(phone, productName, storeName) {
  const clean = phone.replace(/\D/g, '');
  const msg = encodeURIComponent(
    `Hi! I'm interested in "${productName}" from your store "${storeName}" on Supamart.`
  );
  window.open(`https://wa.me/${clean}?text=${msg}`, '_blank');
}