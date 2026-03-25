requireAuth();

const user = getUser();
if (user?.role === 'seller') {
  window.location.href = '../home/index.html';
}

let productData = null;
let userCurrency = 'NGN';
let exchangeRates = {};
let wallets = {};

const params = new URLSearchParams(window.location.search);
const productId = params.get('id');

if (!productId) window.location.href = '../home/index.html';

// ─── Init ─────────────────────────────────────────────────
(async () => {
  userCurrency = await getUserCurrency();
  exchangeRates = await getExchangeRates();

  document.getElementById('checkoutCurrency').value = userCurrency;

  await loadProduct();
  await loadWallets();
  updateCheckoutPrice();
})();

// ─── Load Product ─────────────────────────────────────────
async function loadProduct() {
  try {
    const data = await apiRequest(`/products/${productId}`);
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
          <p>${productData.description?.substring(0, 100)}...</p>
        </div>
      </div>
      <div class="summary-store">
        🏪 Sold by <strong>${store?.businessName || 'Unknown Store'}</strong>
        · 📍 ${store?.location || ''}
      </div>
    `;

  } catch (error) {
    showAlert('Product not found');
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
    console.error('Failed to load wallets');
  }
}

function updateWalletDisplay() {
  const currency = document.getElementById('checkoutCurrency').value;
  const balance = wallets[currency] || 0;
  document.getElementById('walletBalance').textContent =
    formatPrice(balance, currency);
}

// ─── Update Price ─────────────────────────────────────────
function updateCheckoutPrice() {
  if (!productData) return;

  const currency = document.getElementById('checkoutCurrency').value;
  const qty = parseInt(document.getElementById('quantity').value) || 1;

  userCurrency = currency;
  const baseNGN = productData.basePriceNGN;
  const unitPrice = computeDisplayPrice(baseNGN, currency, exchangeRates);
  const fee = unitPrice - (baseNGN * (currency === 'NGN' ? 1 : (exchangeRates[currency] || 1) * 3));
  const total = unitPrice * qty;

  document.getElementById('baseDisplay').textContent =
    formatPrice(baseNGN * (currency === 'NGN' ? 1 : (exchangeRates[currency] || 0.001) * 3), currency);
  document.getElementById('feeDisplay').textContent =
    formatPrice(unitPrice * 0.0909 * qty, currency);
  document.getElementById('totalDisplay').textContent =
    formatPrice(total, currency);

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

    showAlert('Order placed successfully! Payment is held in escrow.', 'success');

    setTimeout(() => {
      window.location.href =
        `../buyer/dashboard.html`;
    }, 2000);

  } catch (error) {
    showAlert(error.message || 'Failed to place order');
    btn.disabled = false;
    btn.innerHTML = '🔒 Place Order (Escrow Protected)';
  }
}

// ─── Fund Wallet (Mock) ───────────────────────────────────
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
    await apiRequest('/wallets/fund', 'POST', { currency, amount: Number(amount) });
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
  box.textContent = message;
  box.className = `alert alert-${type} show`;
  if (type === 'success') return;
  setTimeout(() => box.classList.remove('show'), 5000);
}

document.getElementById('fundModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('fundModal')) closeFundModal();
});
