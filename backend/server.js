const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = 3000;

// middleware (server può leggere dati in JSON e comunicare con React)
app.use(cors());
app.use(express.json());

//configurazione della connessione al database
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'bear_db',
    password: 'BearPass',
    port: 5432,
});

//test
app.get('/', (req, res) => {
    res.send('Il server BearTracker funziona perfettamente!');
});

//salva un nuovo avvistamento nel database
app.post('/api/sightings', async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        const newSighting = await pool.query(
            'INSERT INTO sightings (latitude, longitude) VALUES ($1, $2) RETURNING *',
            [latitude, longitude]
        );
        res.json(newSighting.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Errore durante il salvataggio');
    }
});

//recupera tutti gli avvistamenti per mostrarli sulla mappa
app.get('/api/sightings', async (req, res) => {
    try {
        const allSightings = await pool.query('SELECT * FROM sightings ORDER BY timestamp DESC');
        res.json(allSightings.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Errore nel recupero dei dati');
    }
});

//avvio del server
app.listen(port, () => {
    console.log(`Server backend in ascolto su http://localhost:${port}`);
});

// Nuova API per la ricerca spazio-temporale
app.post('/api/sightings/search', async (req, res) => {
  const { startDate, endDate, polygon } = req.body;
  
  // Costruiamo la query di base. Usiamo ST_X e ST_Y per restituire lat/lon pulite al frontend
  let query = `
    SELECT id, timestamp, description, 
           ST_X(location::geometry) AS longitude, 
           ST_Y(location::geometry) AS latitude 
    FROM sightings 
    WHERE 1=1
  `;
  const values = [];
  let paramIndex = 1;

  // Filtro data di inizio
  if (startDate) {
    query += ` AND timestamp >= $${paramIndex}`;
    values.push(startDate);
    paramIndex++;
  }

  // Filtro data di fine
  if (endDate) {
    query += ` AND timestamp <= $${paramIndex}`;
    values.push(endDate);
    paramIndex++;
  }

  // Filtro spaziale con PostGIS
  if (polygon) {
    // ST_GeomFromGeoJSON converte la geometria del client nel formato PostGIS
    // ST_Intersects controlla se il punto (location) cade all'interno del poligono
    query += ` AND ST_Intersects(location, ST_SetSRID(ST_GeomFromGeoJSON($${paramIndex}), 4326))`;
    values.push(JSON.stringify(polygon)); 
    paramIndex++;
  }

  try {
    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error("Errore nella ricerca:", err);
    res.status(500).json({ error: "Errore durante il filtraggio dei dati" });
  }
});