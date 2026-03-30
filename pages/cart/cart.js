let userCurrency = 'NGN';
let exchangeRates = {};

(async () => {
  userCurrency = await getUserCurrency();
  exchangeRates = await getExchangeRates();

  const select = document.getElementById('currencySelect');
  if (select) select.value = userCurrency;

  renderCart();
})();

// ─── Render Cart ──────────────────────────────────────────
function renderCart() {
  const cart = getCart();
  const container = document.getElementById('cartItemsList');
  const emptyCart = document.getElementById('emptyCart');
  const cartLayout = document.querySelector('.cart-layout');
  const countBadge = document.getElementById('cartItemCount');

  if (cart.length === 0) {
    if (cartLayout) cartLayout.style.display = 'none';
    if (emptyCart) emptyCart.style.display = 'block';
    return;
  }

  if (cartLayout) cartLayout.style.display = 'grid';
  if (emptyCart) emptyCart.style.display = 'none';

  if (countBadge) {
    countBadge.textContent =
      `${getCartCount()} item${getCartCount() !== 1 ? 's' : ''}`;
  }

  container.innerHTML = cart.map(item => {
    const price = computeDisplayPrice(
      item.basePriceNGN,
      userCurrency,
      exchangeRates
    );
    const itemTotal = price * item.quantity;
    const imgHTML = item.image
      ? `<img class="cart-item-img" src="${item.image}" alt=""/>`
      : `<div class="cart-item-img">📦</div>`;

    return `
      <div class="cart-item" id="cartItem-${item.productId}">
        ${imgHTML}
        <div class="cart-item-info">
          <div class="cart-item-store">🏪 ${item.storeName}</div>
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">
            ${formatPrice(itemTotal, userCurrency)}
            <span style="font-size:13px;color:var(--gray-400);
                         font-weight:400;margin-left:6px">
              (${formatPrice(price, userCurrency)} each)
            </span>
          </div>
          <div class="cart-item-controls">
            <div class="qty-controls">
              <button class="qty-btn"
                onclick="changeQty('${item.productId}', ${item.quantity - 1})">
                −
              </button>
              <div class="qty-display">${item.quantity}</div>
              <button class="qty-btn"
                onclick="changeQty('${item.productId}', ${item.quantity + 1})">
                +
              </button>
            </div>
            <button class="btn-remove"
              onclick="removeItem('${item.productId}')">
              🗑 Remove
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  renderSummary(cart);
}

// ─── Render Summary ───────────────────────────────────────
function renderSummary(cart) {
  const summaryLines = document.getElementById('summaryLines');
  const totalEl = document.getElementById('cartTotal');

  summaryLines.innerHTML = cart.map(item => {
    const price = computeDisplayPrice(
      item.basePriceNGN,
      userCurrency,
      exchangeRates
    );
    return `
      <div class="summary-line">
        <span>${item.name} × ${item.quantity}</span>
        <span>${formatPrice(price * item.quantity, userCurrency)}</span>
      </div>
    `;
  }).join('');

  const total = getCartTotal(userCurrency, exchangeRates);
  if (totalEl) totalEl.textContent = formatPrice(total, userCurrency);
}

// ─── Cart Actions ─────────────────────────────────────────
function changeQty(productId, newQty) {
  if (newQty <= 0) {
    removeItem(productId);
    return;
  }
  updateCartQuantity(productId, newQty);
  renderCart();
}

function removeItem(productId) {
  removeFromCart(productId);
  renderCart();
}

function switchCurrency(currency) {
  userCurrency = currency;
  localStorage.setItem('supamart_currency', currency);
  renderCart();
}

function clearCartConfirm() {
  if (!confirm('Clear all items from your cart?')) return;
  clearCart();
  renderCart();
}

// ─── Proceed to Checkout ──────────────────────────────────
function proceedToCheckout() {
  if (!isLoggedIn()) {
    window.location.href = '/pages/auth/login.html';
    return;
  }

  const cart = getCart();
  if (cart.length === 0) {
    alert('Your cart is empty');
    return;
  }

  // Save cart to localStorage for checkout page to read
  localStorage.setItem('supamart_checkout_cart', JSON.stringify({
    items: cart,
    currency: userCurrency,
    total: getCartTotal(userCurrency, exchangeRates)
  }));

  window.location.href = '/pages/checkout/cart-checkout.html';
}