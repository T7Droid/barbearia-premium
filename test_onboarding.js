const http = require('http');

const data = JSON.stringify({
  tenant: { name: "Test Barber " + Date.now() },
  unit: { name: "Matrix", address: "123 St", city: "City", state: "ST" },
  services: [{ name: "Corte", price: 50, duration_minutes: 30 }],
  barber: { name: "John", email: "john_" + Date.now() + "@example.com", description: "" },
  account: { fullName: "Admin John", email: "admin_" + Date.now() + "@example.com", password: "Password123!" },
  planId: "basico"
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/onboarding',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => console.log('Response:', res.statusCode, body));
});

req.on('error', (e) => console.error(e));
req.write(data);
req.end();
