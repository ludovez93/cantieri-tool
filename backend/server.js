const express = require('express');
const path = require('path');
const cors = require('cors');

// Init DB (crea tabelle e utenti default)
require('./db');

const authMiddleware = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const cantieriRoutes = require('./routes/cantieri');
const nottiRoutes = require('./routes/notti');
const saldatureRoutes = require('./routes/saldature');
const parseRoutes = require('./routes/parse');
const meteoRoutes = require('./routes/meteo');
const dashboardRoutes = require('./routes/dashboard');
const binariRoutes = require('./routes/binari');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Serve frontend statico
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// API pubbliche
app.use('/api/auth', authRoutes);

// API protette
app.use('/api/cantieri', authMiddleware, cantieriRoutes);
app.use('/api', authMiddleware, nottiRoutes);
app.use('/api', authMiddleware, saldatureRoutes);
app.use('/api', authMiddleware, parseRoutes);
app.use('/api', authMiddleware, binariRoutes);
app.use('/api/meteo', authMiddleware, meteoRoutes);
app.use('/api', authMiddleware, dashboardRoutes);

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Cantieri Tool API running on port ${PORT}`);
});
