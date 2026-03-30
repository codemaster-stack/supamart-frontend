requireAuth();

const user = getUser();
if (user?.role === 'seller') {
  window.location.href = '/pages/home/index.html';
}

let cartData = null;
let exchangeRates = {};
let wallets = {};
let userCurrency = 'NGN';

// Load checkout data from localStorage
const checkoutData = localStorage.getItem('supamart_checkout_cart');
if (!checkoutData) {
  window.location.href = '/pages/cart/cart.html';
}

cartData = JSON.parse(checkoutData);
userCurrency = cartData.currency || 'NGN';

// ─── Init ─────────────────────────────────────────────────
(async () => {
  exchangeRates = await getExchangeRates();

  const currencySelects = document.querySelectorAll(
    '#checkoutCurrency, #cardCurrency'
  );
  currencySelects.forEach(s => { if (s) s.value = userCurrency; });

  renderCheckoutItems();
  await loadWallets();
  updateSummary();
  updateCardSummary();
  updateBankSummary();
})();

// ─── Render Items ─────────────────────────────────────────
function renderCheckoutItems() {
  const container = document.getElementById('checkoutItemsList');
  const items = cartData.items;

  container.innerHTML = items.map(item => {
    const price = computeDisplayPrice(
      item.basePriceNGN,
      userCurrency,
      exchangeRates
    );
    const imgHTML = item.image
      ? `<img class="cart-item-img" src="${item.image}" alt=""/>`
      : `<div class="cart-item-img">📦</div>`;

    return `
      <div class="cart-item">
        ${imgHTML}
        <div class="cart-item-info">
          <div class="cart-item-store">🏪 ${item.storeName}</div>
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">
            ${formatPrice(price * item.quantity, userCurrency)}
            <span style="font-size:13px;color:var(--gray-400);
                         font-weight:400;margin-left:6px">
              × ${item.quantity}
            </span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ─── Load Wallets ─────────────────────────────────────────
async function loadWallets() {
  try {
    const data = await apiRequest('/wallets');
    data.wallets.forEach(w => { wallets[w.currency] = w.balance; });
    updateWalletDisplay();
  } catch (e) {
    console.error('Failed to load wallets:', e);
  }
}

function updateWalletDisplay() {
  const currency = document.getElementById('checkoutCurrency')?.value
    || userCurrency;
  const balance = wallets[currency] || 0;
  const el = document.getElementById('walletBalance');
  if (el) el.textContent = formatPrice(balance, currency);
}

// ─── Update Summaries ─────────────────────────────────────
function updateSummary() {
  const currency = document.getElementById('checkoutCurrency')?.value
    || userCurrency;
  userCurrency = currency;

  const total = cartData.items.reduce((sum, item) => {
    const price = computeDisplayPrice(
      item.basePriceNGN, currency, exchangeRates
    );
    return sum + (price * item.quantity);
  }, 0);

  const el = document.getElementById('walletTotal');
  if (el) el.textContent = formatPrice(total, currency);
  updateWalletDisplay();
}

function updateCardSummary() {
  const currency = document.getElementById('cardCurrency')?.value
    || 'NGN';

  const total = cartData.items.reduce((sum, item) => {
    const price = computeDisplayPrice(
      item.basePriceNGN, currency, exchangeRates
    );
    return sum + (price * item.quantity);
  }, 0);

  const el = document.getElementById('cardTotalDisplay');
  if (el) el.textContent = formatPrice(total, currency);
}

function updateBankSummary() {
  const total = cartData.items.reduce((sum, item) => {
    const price = computeDisplayPrice(
      item.basePriceNGN, 'NGN', exchangeRates
    );
    return sum + (price * item.quantity);
  }, 0);

  const el = document.getElementById('bankTotalDisplay');
  if (el) el.textContent = formatPrice(total, 'NGN');
}

// ─── Pay with Wallet (all items) ─────────────────────────
async function placeAllOrders() {
  const currency = document.getElementById('checkoutCurrency').value;
  const btn = document.getElementById('placeAllOrdersBtn');

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Placing orders...';

  let successCount = 0;
  let failCount = 0;

  for (const item of cartData.items) {
    try {
      await apiRequest('/orders', 'POST', {
        productId: item.productId,
        quantity: item.quantity,
        currency
      });
      successCount++;
    } catch (error) {
      console.error(`Failed order for ${item.name}:`, error.message);
      failCount++;
    }
  }

  if (successCount > 0) {
    clearCart();
    localStorage.removeItem('supamart_checkout_cart');

    if (failCount > 0) {
      showAlert(
        `${successCount} order(s) placed. ${failCount} failed — insufficient balance.`,
        'success'
      );
    } else {
      showAlert(
        `All ${successCount} order(s) placed successfully!`,
        'success'
      );
    }

    setTimeout(() => {
      window.location.href = '/pages/buyer/dashboard.html';
    }, 2500);
  } else {
    showAlert(
      'All orders failed. Check your wallet balance.',
    );
    btn.disabled = false;
    btn.innerHTML = '🔒 Place All Orders (Escrow Protected)';
  }
}

// ─── Pay with Card (first item only, rest by wallet) ─────
async function payCartWithCard() {
  const currency = document.getElementById('cardCurrency').value;
  const firstItem = cartData.items[0];

  if (!firstItem) return;

  const btn = document.getElementById('cardPayBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Initializing...';

  try {
    const data = await apiRequest('/payments/initialize', 'POST', {
      productId: firstItem.productId,
      quantity: firstItem.quantity,
      currency
    });

    window.location.href = data.authorizationUrl;

  } catch (error) {
    showAlert(error.message || 'Failed to initialize card payment');
    btn.disabled = false;
    btn.innerHTML = '💳 Pay with Card';
  }
}

// ─── Pay with Bank Transfer (first item) ─────────────────
async function payCartWithBank() {
  const firstItem = cartData.items[0];
  if (!firstItem) return;

  const btn = document.getElementById('bankPayBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Generating details...';

  try {
    const data = await apiRequest('/payments/bank-transfer', 'POST', {
      productId: firstItem.productId,
      quantity: firstItem.quantity,
      currency: 'NGN'
    });

    window.location.href = data.authorizationUrl;

  } catch (error) {
    showAlert(error.message || 'Failed to initialize bank transfer');
    btn.disabled = false;
    btn.innerHTML = '🏦 Get Transfer Details';
  }
}

// ─── Tab Switch ───────────────────────────────────────────
function switchPayTab(tab) {
  const sections = {
    wallet: document.getElementById('walletPaySection'),
    card: document.getElementById('cardPaySection'),
    bank: document.getElementById('bankPaySection')
  };
  const tabs = {
    wallet: document.getElementById('tabWallet'),
    card: document.getElementById('tabCard'),
    bank: document.getElementById('tabBank')
  };

  Object.values(sections).forEach(s => {
    if (s) s.style.display = 'none';
  });
  Object.values(tabs).forEach(t => {
    if (t) t.classList.remove('active');
  });

  if (sections[tab]) sections[tab].style.display = 'block';
  if (tabs[tab]) tabs[tab].classList.add('active');

  if (tab === 'card') updateCardSummary();
  if (tab === 'bank') updateBankSummary();
}

// ─── Alerts ───────────────────────────────────────────────
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