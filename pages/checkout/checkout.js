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


// ─── Payment Tab Switch ───────────────────────────────────
function switchPayTab(tab) {
  const walletSection = document.getElementById('walletPaySection');
  const cardSection = document.getElementById('cardPaySection');
  const tabWallet = document.getElementById('tabWallet');
  const tabCard = document.getElementById('tabCard');

  if (tab === 'wallet') {
    walletSection.style.display = 'block';
    cardSection.style.display = 'none';
    tabWallet.classList.add('active');
    tabCard.classList.remove('active');
  } else {
    walletSection.style.display = 'none';
    cardSection.style.display = 'block';
    tabCard.classList.add('active');
    tabWallet.classList.remove('active');
    updateCardPrice();
  }
}

// ─── Update Card Price ────────────────────────────────────
function updateCardPrice() {
  if (!productData) return;

  const currency = document.getElementById('cardCurrency').value;
  const qty = parseInt(document.getElementById('cardQuantity').value) || 1;

  const unitPrice = computeDisplayPrice(
    productData.basePriceNGN,
    currency,
    exchangeRates
  );
  const total = unitPrice * qty;

  const baseEl = document.getElementById('cardBaseDisplay');
  const qtyEl = document.getElementById('cardQtyDisplay');
  const totalEl = document.getElementById('cardTotalDisplay');

  if (baseEl) baseEl.textContent = formatPrice(unitPrice, currency);
  if (qtyEl) qtyEl.textContent = qty;
  if (totalEl) totalEl.textContent = formatPrice(total, currency);
}

// ─── Pay with Card (Paystack) ─────────────────────────────
async function payWithCard() {
  if (!productData) return;

  const currency = document.getElementById('cardCurrency').value;
  const quantity = parseInt(document.getElementById('cardQuantity').value) || 1;

  const btn = document.getElementById('cardPayBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Initializing payment...';

  try {
    const data = await apiRequest('/payments/initialize', 'POST', {
      productId,
      quantity,
      currency
    });

    // Redirect to Paystack payment page
    window.location.href = data.authorizationUrl;

  } catch (error) {
    showAlert(error.message || 'Failed to initialize payment');
    btn.disabled = false;
    btn.innerHTML = '💳 Pay with Card';
  }
}

      // ─── Bank Transfer Tab ────────────────────────────────────
let bankReference = null;
let transferTimer = null;

function updateBankPrice() {
  if (!productData) return;

  const qty = parseInt(document.getElementById('bankQuantity').value) || 1;
  const unitPrice = computeDisplayPrice(
    productData.basePriceNGN,
    'NGN',
    exchangeRates
  );
  const total = unitPrice * qty;

  const baseEl = document.getElementById('bankBaseDisplay');
  const qtyEl = document.getElementById('bankQtyDisplay');
  const totalEl = document.getElementById('bankTotalDisplay');

  if (baseEl) baseEl.textContent = formatPrice(unitPrice, 'NGN');
  if (qtyEl) qtyEl.textContent = qty;
  if (totalEl) totalEl.textContent = formatPrice(total, 'NGN');
}

// ─── Initialize Bank Transfer ─────────────────────────────
async function initBankTransfer() {
  if (!productData) return;

  const quantity = parseInt(document.getElementById('bankQuantity').value) || 1;
  const btn = document.getElementById('bankPayBtn');

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Generating account...';

  try {
    const data = await apiRequest('/payments/bank-transfer', 'POST', {
      productId,
      quantity,
      currency: 'NGN'
    });

    bankReference = data.reference;

    // Show transfer details
    const details = data.transferDetails;
    document.getElementById('transferBank').textContent =
      details.bank || 'See payment page';
    document.getElementById('transferAccount').textContent =
      details.accountNumber || 'See payment page';
    document.getElementById('transferName').textContent =
      details.accountName || 'Paystack';
    document.getElementById('transferAmount').textContent =
      formatPrice(details.amount, 'NGN');

    document.getElementById('transferDetails').style.display = 'block';
    btn.style.display = 'none';

    // If Paystack redirects for bank transfer
    if (data.authorizationUrl) {
      window.location.href = data.authorizationUrl;
      return;
    }

    // Start 30 minute countdown
    startTransferTimer(30 * 60);

    showAlert(
      'Transfer details generated! Please transfer the exact amount.',
      'success'
    );

  } catch (error) {
    showAlert(error.message || 'Failed to generate transfer details');
    btn.disabled = false;
    btn.innerHTML = '🏦 Get Transfer Details';
  }
}

// ─── Countdown Timer ──────────────────────────────────────
function startTransferTimer(seconds) {
  clearInterval(transferTimer);
  let remaining = seconds;

  transferTimer = setInterval(() => {
    remaining--;
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    const timerEl = document.getElementById('transferTimer');
    if (timerEl) {
      timerEl.textContent =
        `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    if (remaining <= 0) {
      clearInterval(transferTimer);
      if (timerEl) timerEl.textContent = 'Expired';
      showAlert('Transfer window expired. Please start again.');
      document.getElementById('transferDetails').style.display = 'none';
      document.getElementById('bankPayBtn').style.display = 'block';
      document.getElementById('bankPayBtn').disabled = false;
      document.getElementById('bankPayBtn').textContent =
        '🏦 Get Transfer Details';
      bankReference = null;
    }
  }, 1000);
}

// ─── Copy Account Number ──────────────────────────────────
function copyAccountNumber() {
  const accountNumber = document.getElementById('transferAccount').textContent;
  navigator.clipboard.writeText(accountNumber).then(() => {
    showAlert('Account number copied!', 'success');
  }).catch(() => {
    const el = document.createElement('textarea');
    el.value = accountNumber;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    showAlert('Account number copied!', 'success');
  });
}

// ─── Check Bank Payment ───────────────────────────────────
async function checkBankPayment() {
  if (!bankReference) {
    showAlert('No active transfer found');
    return;
  }

  const btn = document.getElementById('checkPaymentBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Checking payment...';

  try {
    const data = await apiRequest('/payments/verify', 'POST', {
      reference: bankReference
    });

    clearInterval(transferTimer);
    showAlert('Payment confirmed! Redirecting...', 'success');

    setTimeout(() => {
      window.location.href = '/pages/buyer/dashboard.html';
    }, 2000);

  } catch (error) {
    // Payment not confirmed yet
    if (error.message.includes('not successful')) {
      showAlert(
        'Payment not confirmed yet. Please complete the transfer and try again.'
      );
    } else {
      showAlert(error.message || 'Could not verify payment');
    }
    btn.disabled = false;
    btn.innerHTML = '🔄 I Have Transferred — Check Payment';
  }
}

// ─── Update switchPayTab to include bank ──────────────────
function switchPayTab(tab) {
  const walletSection = document.getElementById('walletPaySection');
  const cardSection = document.getElementById('cardPaySection');
  const bankSection = document.getElementById('bankPaySection');
  const tabWallet = document.getElementById('tabWallet');
  const tabCard = document.getElementById('tabCard');
  const tabBank = document.getElementById('tabBank');

  // Hide all
  walletSection.style.display = 'none';
  cardSection.style.display = 'none';
  bankSection.style.display = 'none';

  // Remove active from all tabs
  tabWallet.classList.remove('active');
  tabCard.classList.remove('active');
  tabBank.classList.remove('active');

  if (tab === 'wallet') {
    walletSection.style.display = 'block';
    tabWallet.classList.add('active');
  } else if (tab === 'card') {
    cardSection.style.display = 'block';
    tabCard.classList.add('active');
    updateCardPrice();
  } else if (tab === 'bank') {
    bankSection.style.display = 'block';
    tabBank.classList.add('active');
    updateBankPrice();
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