// ─── Cart System ──────────────────────────────────────────
// Cart is stored in localStorage
// Each item: { productId, name, price, basePriceNGN, image,
//              storeName, storeSlug, phoneNumber, quantity }

const CART_KEY = 'supamart_cart';

// Get cart
function getCart() {
  const cart = localStorage.getItem(CART_KEY);
  return cart ? JSON.parse(cart) : [];
}

// Save cart
function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

// Add item to cart
function addToCart(product, storeName, storeSlug, phoneNumber) {
  const cart = getCart();

  const existing = cart.find(item => item.productId === product._id);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      productId: product._id,
      name: product.name,
      basePriceNGN: product.basePriceNGN,
      image: product.images?.[0] || '',
      storeName: storeName || 'Unknown Store',
      storeSlug: storeSlug || '',
      phoneNumber: phoneNumber || '',
      quantity: 1
    });
  }

  saveCart(cart);
  return cart.length;
}

// Remove item from cart
function removeFromCart(productId) {
  const cart = getCart().filter(item => item.productId !== productId);
  saveCart(cart);
}

// Update quantity
function updateCartQuantity(productId, quantity) {
  const cart = getCart();
  const item = cart.find(i => i.productId === productId);
  if (item) {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    item.quantity = quantity;
    saveCart(cart);
  }
}

// Clear cart
function clearCart() {
  localStorage.removeItem(CART_KEY);
  updateCartBadge();
}

// Get cart count
function getCartCount() {
  return getCart().reduce((total, item) => total + item.quantity, 0);
}

// Get cart total in a currency
function getCartTotal(currency, rates) {
  return getCart().reduce((total, item) => {
    const price = computeDisplayPrice(
      item.basePriceNGN,
      currency,
      rates
    );
    return total + (price * item.quantity);
  }, 0);
}

// Update cart badge in navbar
function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  if (badge) {
    const count = getCartCount();
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
}