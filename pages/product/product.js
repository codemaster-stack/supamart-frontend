let productData = null;
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
    // Get product ID from URL
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');

    console.log('Product ID from URL:', productId);

    if (!productId || productId === 'undefined' || productId === 'null') {
      console.error('No valid product ID in URL');
      showError();
      return;
    }

    // Load currency and rates
    userCurrency = await getUserCurrency();
    exchangeRates = await getExchangeRates();

    // Set currency dropdown
    const currencySelect = document.getElementById('currencySelect');
    if (currencySelect) currencySelect.value = userCurrency;

    // Load product
    await loadProduct(productId);

  } catch (err) {
    console.error('Init error:', err);
    showError();
  }
})();

// ─── Load Product ─────────────────────────────────────────
async function loadProduct(productId) {
  try {
    console.log('Fetching product:', productId);
    const data = await apiRequest(`/products/${productId}`);
    console.log('Product data received:', data);

    if (!data || !data.product) {
      console.error('No product in response');
      showError();
      return;
    }

    productData = data.product;
    renderProduct(productData);

  } catch (error) {
    console.error('Load product error:', error.message);
    showError();
  }
}

// ─── Render Product ───────────────────────────────────────
function renderProduct(product) {
  document.title = `${product.name} — Supamart`;

  // Images
  const mainImg = document.getElementById('mainImage');
  const placeholder = document.getElementById('mainImagePlaceholder');

  if (product.images && product.images.length > 0) {
    mainImg.src = product.images[0];
    mainImg.style.display = 'block';
    if (placeholder) placeholder.style.display = 'none';

    // Thumbnails
    const thumbsContainer = document.getElementById('imageThumbnails');
    if (thumbsContainer) {
      thumbsContainer.innerHTML = '';
      product.images.forEach((img, index) => {
        const thumb = document.createElement('img');
        thumb.src = img;
        thumb.className = `thumbnail ${index === 0 ? 'active' : ''}`;
        thumb.addEventListener('click', () => switchImage(img, thumb));
        thumbsContainer.appendChild(thumb);
      });
    }
  } else {
    if (mainImg) mainImg.style.display = 'none';
    if (placeholder) placeholder.style.display = 'flex';
  }

  // Store badge
  const store = product.storeId;
  if (store) {
    const storeLogoImg = document.getElementById('storeLogoImg');
    if (storeLogoImg) {
      if (store.logoUrl) {
        storeLogoImg.src = store.logoUrl;
        storeLogoImg.style.display = 'block';
      } else {
        storeLogoImg.style.display = 'none';
      }
    }

    const storeNameLink = document.getElementById('storeNameLink');
    if (storeNameLink) {
      storeNameLink.textContent = store.businessName || 'Unknown Store';
      storeNameLink.href =
        `/pages/store/store.html?slug=${store.slug}`;
    }
  }

  // Title
  const titleEl = document.getElementById('productTitle');
  if (titleEl) titleEl.textContent = product.name;

  // Price
  updatePrice();

  // Description
  const descEl = document.getElementById('productDescription');
  if (descEl) descEl.textContent = product.description;

  // Meta
  const metaEl = document.getElementById('productMeta');
  if (metaEl) {
    metaEl.textContent = `Listed on ${new Date(product.createdAt)
      .toLocaleDateString('en-NG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`;
  }

  // Hide loader, show content
  const loader = document.getElementById('pageLoader');
  const main = document.getElementById('productMain');

  if (loader) loader.style.display = 'none';
  if (main) main.style.display = 'block';
}

// ─── Update Price ─────────────────────────────────────────
function updatePrice() {
  if (!productData) return;
  const price = computeDisplayPrice(
    productData.basePriceNGN,
    userCurrency,
    exchangeRates
  );
  const priceEl = document.getElementById('currentPrice');
  if (priceEl) priceEl.textContent = formatPrice(price, userCurrency);
}

// ─── Switch Currency ──────────────────────────────────────
function switchCurrency(currency) {
  userCurrency = currency;
  localStorage.setItem('supamart_currency', currency);
  updatePrice();
}

// ─── Switch Image ─────────────────────────────────────────
function switchImage(src, thumbEl) {
  const mainImg = document.getElementById('mainImage');
  if (mainImg) mainImg.src = src;
  document.querySelectorAll('.thumbnail').forEach(t =>
    t.classList.remove('active')
  );
  if (thumbEl) thumbEl.classList.add('active');
}

// ─── Go to Checkout ───────────────────────────────────────
function goToCheckout() {
  if (!isLoggedIn()) {
    window.location.href = '/pages/auth/login.html';
    return;
  }
  if (!productData) {
    alert('Product data not loaded yet. Please wait.');
    return;
  }
  const productId = productData._id;
  console.log('Going to checkout with product ID:', productId);
  window.location.href = `/pages/checkout/checkout.html?id=${productId}`;
}

// ─── Contact Seller on WhatsApp ───────────────────────────
function contactSeller() {
  const store = productData?.storeId;
  if (!store?.phoneNumber) {
    alert('Seller contact not available');
    return;
  }
  const phone = store.phoneNumber.replace(/\D/g, '');
  const message = encodeURIComponent(
    `Hi! I'm interested in "${productData.name}" from your store "${store.businessName}" on Supamart. Please provide more details.`
  );
  window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
}

// ─── Error State ──────────────────────────────────────────
function showError() {
  const loader = document.getElementById('pageLoader');
  const errorState = document.getElementById('errorState');
  if (loader) loader.style.display = 'none';
  if (errorState) errorState.style.display = 'block';
}