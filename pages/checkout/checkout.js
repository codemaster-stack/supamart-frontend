// ─── Auth Check ───────────────────────────────────────────
const user = getUser();
const token = getToken();

console.log('Checkout - User:', user);
console.log('Checkout - Token:', token);

if (!token || !user) {
  window.location.href = '/pages/auth/login.html';
}

if (user && user.role === 'seller') {
  window.location.href = '/pages/home/index.html';
}

// ─── State ────────────────────────────────────────────────
let productData = null;
let userCurrency = 'NGN';
let exchangeRates = {};
let wallets = {};

const params = new URLSearchParams(window.location.search);
const productId = params.get('id');

console.log('Checkout page - Product ID:', productId);

if (!productId || productId === 'undefined' || productId === 'null') {
  window.location.href = '/pages/home/index.html';
}

// ─── Init ─────────────────────────────────────────────────
(async () => {
  try {
    userCurrency = await getUserCurrency();
    exchangeRates = await getExchangeRates();

    const currencySelect = document.getElementById('checkoutCurrency');
    if (currencySelect) currencySelect.value = userCurrency;

    if (productId) {
      await loadProduct();
      await loadWallets();
      updateCheckoutPrice();
    }
  } catch (err) {
    console.error('Checkout init error:', err);
  }
})();

// ─── Load Product ─────────────────────────────────────────
async function loadProduct() {
  try {
    console.log('Loading product:', productId);
    const data = await apiRequest(`/products/${productId}`);

    if (!data || !data.product) {
      showAlert('Product not found');
      return;
    }

    productData = data.product;
    const store = productData.storeId;

    const imgHTML = productData.images?.length > 0
      ? `<img class="summary-img" src="${productData.images[0]}" alt=""/>`
      : `<div class="summary-img">📦</div>`;

    document.getElementById('summaryCard').innerHTML = `
      <div class="summary-product">
        ${imgHTML}
        <div class="summary-info">
          <h3>${productData.name}</h3>
          <p>${productData.description?.substring(0, 120)}...</p>
        </div>
      </div>
      <div class="summary-store">
        🏪 Sold by <strong>${store?.businessName || 'Unknown Store'}</strong>
        &nbsp;·&nbsp; 📍 ${store?.location || ''}
      </div>
    `;

  } catch (error) {
    console.error('Load product error:', error);
    document.getElementById('summaryCard').innerHTML = `
      <p style="padding:20px;text-align:center;color:var(--danger)">
        Failed to load product.
        <a href="/pages/home/index.html">Go back</a>
      </p>
    `;
  }
}

// ─── Load Wallets ─────────────────────────────────────────
async function loadWallets() {
  try {
    const data = await apiRequest('/wallets');
    data.wallets.forEach(w => {
      wallets[w.currency] = w.balance;
    });
    updateWalletDisplay();
  } catch (error) {
    console.error('Failed to load wallets:', error);
  }
}

// ─── Update Wallet Display ────────────────────────────────
function updateWalletDisplay() {
  const currency = document.getElementById('checkoutCurrency').value;
  const balance = wallets[currency] || 0;
  const balanceEl = document.getElementById('walletBalance');
  if (balanceEl) balanceEl.textContent = formatPrice(balance, currency);
}

// ─── Update Price ─────────────────────────────────────────
function updateCheckoutPrice() {
  if (!productData) return;

  const currency = document.getElementById('checkoutCurrency').value;
  const qty = parseInt(document.getElementById('quantity').value) || 1;

  userCurrency = currency;

  const unitPrice = computeDisplayPrice(
    productData.basePriceNGN,
    currency,
    exchangeRates
  );
  const total = unitPrice * qty;

  const baseEl = document.getElementById('baseDisplay');
  const qtyEl = document.getElementById('qtyDisplay');
  const totalEl = document.getElementById('totalDisplay');

  if (baseEl) baseEl.textContent = formatPrice(unitPrice, currency);
  if (qtyEl) qtyEl.textContent = qty;
  if (totalEl) totalEl.textContent = formatPrice(total, currency);

  updateWalletDisplay();
}

// ─── Place Order ──────────────────────────────────────────
async function placeOrder() {
  const currency = document.getElementById('checkoutCurrency').value;
  const quantity = parseInt(document.getElementById('quantity').value) || 1;

  const btn = document.getElementById('placeOrderBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Placing order...';

  try {
    const data = await apiRequest('/orders', 'POST', {
      productId,
      quantity,
      currency
    });

    showAlert('Order placed! Payment is held in escrow.', 'success');

    setTimeout(() => {
      window.location.href = '/pages/buyer/dashboard.html';
    }, 2000);

  } catch (error) {
    showAlert(error.message || 'Failed to place order');
    btn.disabled = false;
    btn.innerHTML = '🔒 Place Order (Escrow Protected)';
  }
}

// ─── Fund Wallet Modal ────────────────────────────────────
function showFundModal() {
  document.getElementById('fundModal').classList.add('open');
}

function closeFundModal() {
  document.getElementById('fundModal').classList.remove('open');
}

async function fundWallet() {
  const currency = document.getElementById('fundCurrency').value;
  const amount = document.getElementById('fundAmount').value;

  if (!amount || amount <= 0) {
    return showAlert('Enter a valid amount');
  }

  try {
    await apiRequest('/wallets/fund', 'POST', {
      currency,
      amount: Number(amount)
    });
    closeFundModal();
    await loadWallets();
    updateCheckoutPrice();
    showAlert(`${currency} wallet funded successfully!`, 'success');
  } catch (error) {
    showAlert(error.message || 'Failed to fund wallet');
  }
}

// ─── Alert Helpers ────────────────────────────────────────
function showAlert(message, type = 'error') {
  const box = type === 'error'
    ? document.getElementById('alertBox')
    : document.getElementById('successBox');
  if (!box) return;
  box.textContent = message;
  box.className = `alert alert-${type} show`;
  if (type !== 'success') {
    setTimeout(() => box.classList.remove('show'), 5000);
  }
}

// Close fund modal on overlay click
const fundModal = document.getElementById('fundModal');
if (fundModal) {
  fundModal.addEventListener('click', (e) => {
    if (e.target === fundModal) closeFundModal();
  });
}