const express = require('express');
const https = require('https');

const router = express.Router();

// Cache semplice: chiave = "lat,lon", valore = { data, timestamp }
const cache = new Map();
const CACHE_TTL = 3600000; // 1 ora

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// GET /api/meteo/:lat/:lon
router.get('/:lat/:lon', async (req, res) => {
  const lat = parseFloat(req.params.lat);
  const lon = parseFloat(req.params.lon);
  if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return res.status(400).json({ error: 'Coordinate non valide' });
  }
  const key = `${lat},${lon}`;

  // Check cache
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json(cached.data);
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=Europe/Rome&forecast_days=5&models=icon_eu`;
    const data = await fetchJson(url);

    const previsioni = data.daily.time.map((giorno, i) => ({
      data: giorno,
      temp_max: data.daily.temperature_2m_max[i],
      temp_min: data.daily.temperature_2m_min[i],
      pioggia_mm: data.daily.precipitation_sum[i],
      codice_meteo: data.daily.weathercode[i]
    }));

    const result = { localita: `${lat},${lon}`, previsioni };
    cache.set(key, { data: result, timestamp: Date.now() });
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: 'Errore meteo: ' + err.message });
  }
});

module.exports = router;
