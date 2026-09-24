const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = 3000;

// 1. Middleware (permettono al server di leggere i dati in JSON e comunicare con React)
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