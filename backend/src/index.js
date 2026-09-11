// src/index.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' } // Open everything up during the development phase, then tighten it later.
});

// Middleware
app.use(cors());
app.use(express.json());

// test route
app.get('/', (req, res) => {
  res.json({ message: 'CommunityCare backend is running' });
});

// Socket.IO testinf
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// start
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});