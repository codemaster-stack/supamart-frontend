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
  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id');

  if (!productId) {
    showError();
    return;
  }

  userCurrency = await getUserCurrency();
  exchangeRates = await getExchangeRates();

  // Set currency dropdown
  document.getElementById('currencySelect').value = userCurrency;

  await loadProduct(productId);
})();

// ─── Load Product ─────────────────────────────────────────
async function loadProduct(productId) {
  try {
    const data = await apiRequest(`/products/${productId}`);
    productData = data.product;
    renderProduct(productData);
  } catch (error) {
    showError();
  }
}

// ─── Render Product ───────────────────────────────────────
function renderProduct(product) {
  document.title = `${product.name} — Supamart`;

  // Images
  if (product.images && product.images.length > 0) {
    const mainImg = document.getElementById('mainImage');
    mainImg.src = product.images[0];
    mainImg.style.display = 'block';
    document.getElementById('mainImagePlaceholder').style.display = 'none';

    // Thumbnails
    const thumbsContainer = document.getElementById('imageThumbnails');
    product.images.forEach((img, index) => {
      const thumb = document.createElement('img');
      thumb.src = img;
      thumb.className = `thumbnail ${index === 0 ? 'active' : ''}`;
      thumb.onclick = () => switchImage(img, thumb);
      thumbsContainer.appendChild(thumb);
    });
  }

  // Store badge
  const store = product.storeId;
  if (store) {
    if (store.logoUrl) {
      document.getElementById('storeLogoImg').src = store.logoUrl;
    }
    document.getElementById('storeNameLink').textContent = store.businessName;
    document.getElementById('storeNameLink').href =
      `../store/store.html?slug=${store.slug}`;
  }

  // Title
  document.getElementById('productTitle').textContent = product.name;

  // Price
  updatePrice();

  // Description
  document.getElementById('productDescription').textContent =
    product.description;

  // Meta
  document.getElementById('productMeta').textContent =
    `Listed on ${new Date(product.createdAt).toLocaleDateString('en-NG', {
      year: 'numeric', month: 'long', day: 'numeric'
    })}`;

  // Show page
  document.getElementById('pageLoader').style.display = 'none';
  document.getElementById('productMain').style.display = 'block';
}

// ─── Update Price ─────────────────────────────────────────
function updatePrice() {
  if (!productData) return;
  const price = computeDisplayPrice(
    productData.basePriceNGN,
    userCurrency,
    exchangeRates
  );
  document.getElementById('currentPrice').textContent =
    formatPrice(price, userCurrency);
}

// ─── Switch Currency ──────────────────────────────────────
function switchCurrency(currency) {
  userCurrency = currency;
  localStorage.setItem('supamart_currency', currency);
  updatePrice();
}

// ─── Switch Image ─────────────────────────────────────────
function switchImage(src, thumbEl) {
  document.getElementById('mainImage').src = src;
  document.querySelectorAll('.thumbnail').forEach(t =>
    t.classList.remove('active')
  );
  thumbEl.classList.add('active');
}

// ─── Go to Checkout ───────────────────────────────────────
function goToCheckout() {
  if (!isLoggedIn()) {
    window.location.href = '/pages/auth/login.html';
    return;
  }
 window.location.href = `/pages/checkout/checkout.html?id=${productData._id}`;
}

// ─── Contact Seller ───────────────────────────────────────
function contactSeller() {
  const store = productData?.storeId;
  if (!store?.phoneNumber) {
    alert('Seller contact not available');
    return;
  }
  const phone = store.phoneNumber.replace(/\D/g, '');
  const message = encodeURIComponent(
    `Hi! I'm interested in "${productData.name}" from your store "${store.businessName}" on Supamart.`
  );
  window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
}

// ─── Error State ──────────────────────────────────────────
function showError() {
  document.getElementById('pageLoader').style.display = 'none';
  document.getElementById('errorState').style.display = 'block';
}