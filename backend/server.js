const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = 3000;

// middleware (server può leggere dati in JSON e comunicare con React)
app.use(cors());
app.use(express.json());

// configurazione della connessione al database
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'bear_db',
  password: 'BearPass',
  port: 5432,
});

// test
app.get('/', (req, res) => {
  res.send('Il server BearTracker funziona perfettamente!');
});

// salva un nuovo avvistamento nel database (aggiornato per PostGIS)
app.post('/api/sightings', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const query = `
      INSERT INTO sightings (timestamp, location, description)
      VALUES (NOW(), ST_SetSRID(ST_MakePoint($1, $2), 4326), 'Avvistamento inserito manualmente')
      RETURNING id, timestamp, description, ST_X(location::geometry) AS longitude, ST_Y(location::geometry) AS latitude
    `;
    // Passiamo prima la longitudine (ST_MakePoint vuole X, Y)
    const result = await pool.query(query, [longitude, latitude]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Errore durante il salvataggio');
  }
});

// ricerca spazio-temporale
app.post('/api/sightings/search', async (req, res) => {
  const { startDate, endDate, polygon } = req.body;
  
  // query di base, uso ST_X e ST_Y per restituire lat/lon pulite al frontend
  let query = `
    SELECT id, timestamp, description, 
           ST_X(location::geometry) AS longitude, 
           ST_Y(location::geometry) AS latitude 
    FROM sightings 
    WHERE 1=1
  `;
  const values = [];
  let paramIndex = 1;

  // filtro data di INIZIO
  if (startDate) {
    query += ` AND timestamp >= $${paramIndex}`;
    values.push(startDate);
    paramIndex++;
  }

  // filtro data di FINE
  if (endDate) {
    query += ` AND timestamp <= $${paramIndex}`;
    values.push(endDate);
    paramIndex++;
  }

  // filtro SPAZIALE con PostGIS
  if (polygon) {
    // ST_GeomFromGeoJSON converte la geometria del client nel formato PostGIS
    // ST_Intersects controlla se il punto cade all'interno del poligono
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

// avvio del server
app.listen(port, () => {
  console.log(`Server backend in ascolto su http://localhost:${port}`);
});