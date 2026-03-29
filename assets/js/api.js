// ─── CHANGE THIS TO YOUR RENDER URL AFTER DEPLOYMENT ───
const PAYSTACK_PUBLIC_KEY = 'pk_test_94b54a31c0eb8533fa6f30cff6990f0b2f061ee3';
const BASE_URL = 'https://supamart-backend.onrender.com/api';

async function apiRequest(endpoint, method = 'GET', body = null) {
  const token = localStorage.getItem('supamart_token');

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    },
    ...(body && { body: JSON.stringify(body) })
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
}


// ─── CHANGE THIS TO YOUR RENDER URL AFTER DEPLOYMENT ───
// const BASE_URL = 'http://localhost:5000/api';

async function apiRequest(endpoint, method = 'GET', body = null) {
  const token = localStorage.getItem('supamart_token');

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    },
    ...(body && { body: JSON.stringify(body) })
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
}

// ─── Currency & Pricing Helpers ───────────────────────────
const MARKUP = 1.10;
const INTL_MULTIPLIER = 3;

const CURRENCY_SYMBOLS = {
  NGN: '₦', USD: '$', GBP: '£', EUR: '€'
};

// Compute display price from base NGN price
function computeDisplayPrice(basePriceNGN, currency, rates) {
  const withMarkup = basePriceNGN * MARKUP;
  if (currency === 'NGN') return withMarkup;
  const rate = rates[currency] || 1;
  return (withMarkup * rate) * INTL_MULTIPLIER;
}

// Format price nicely
function formatPrice(amount, currency) {
  const locales = {
    NGN: 'en-NG', USD: 'en-US', GBP: 'en-GB', EUR: 'de-DE'
  };
  return new Intl.NumberFormat(locales[currency] || 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2
  }).format(amount);
}

// Get or detect user currency
async function getUserCurrency() {
  // Check saved preference first
  const saved = localStorage.getItem('supamart_currency');
  if (saved) return saved;

  try {
    const data = await apiRequest('/currency/detect');
    localStorage.setItem('supamart_currency', data.currency);
    return data.currency;
  } catch {
    return 'NGN';
  }
}

// Get exchange rates (cached in localStorage for 1 hour)
async function getExchangeRates() {
  const cached = localStorage.getItem('supamart_rates');
  const cachedTime = localStorage.getItem('supamart_rates_time');

  if (cached && cachedTime) {
    const age = Date.now() - parseInt(cachedTime);
    if (age < 3600000) return JSON.parse(cached); // 1 hour cache
  }

  try {
    const data = await apiRequest('/currency/rates');
    localStorage.setItem('supamart_rates', JSON.stringify(data.rates));
    localStorage.setItem('supamart_rates_time', Date.now().toString());
    return data.rates;
  } catch {
    return { USD: 0.00065, GBP: 0.00051, EUR: 0.00060, NGN: 1 };
  }
}