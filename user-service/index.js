const express = require('express');
const app = express();
const PORT = 3001;

const SERVICE_NAME = 'user-service';

app.use((req, res, next) => {
  console.log(`[${SERVICE_NAME}] ${req.method} ${req.path}`);
  next();
});


// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'User Service is healthy' });
});

// User endpoint
app.get('/user', (req, res) => {
  res.json({
    id: 101,
    name: 'Test User',
    role: 'customer'
  });
});

// Start server (ALWAYS LAST)
const server = app.listen(PORT, () => {
  console.log(`User Service running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('User Service shutting down...');
  server.close(() => {
    console.log('User Service closed');
    process.exit(0);
  });
});

