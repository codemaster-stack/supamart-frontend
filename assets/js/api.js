// ─── CHANGE THIS TO YOUR RENDER URL AFTER DEPLOYMENT ───
const BASE_URL = 'http://localhost:5000/api';

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