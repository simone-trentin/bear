const fs = require('fs');
const csv = require('csv-parser');
const { Pool } = require('pg');

// configurazione database
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'bear_db',
  password: 'BearPass',
  port: 5432,
});

const fileCsv = './data/tokyo_bear.csv';
const risultati = [];

console.log(`Leggendo il file ${fileCsv}...`);

fs.createReadStream(fileCsv)
  .pipe(csv())
  .on('data', (riga) => risultati.push(riga))
  .on('end', async () => {
    console.log(`Trovate ${risultati.length} righe. Inizio l'inserimento nel database...`);
    
    for (const riga of risultati) {
      // puliamo i decimali e aggiungiamo lo zero se è una cifra sola
      const ora = String(parseInt(riga.hour || 0)).padStart(2, '0');
      const minuto = String(parseInt(riga.minute || 0)).padStart(2, '0');
      const secondo = String(parseInt(riga.second || 0)).padStart(2, '0');
      
      // creo la stringa timestamp unificata (YYYY-MM-DD HH:MM:SS) usando 'secondo'
      const dataUnita = `${riga.year}-${riga.month}-${riga.day} ${ora}:${minuto}:${secondo}`;
      
      // query con ST_MakePoint (PRIMA la longitudine, POI la latitudine)
      const query = `
        INSERT INTO sightings (timestamp, location, description)
        VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4)
      `;
      
      const valori = [dataUnita, riga.lon, riga.lat, riga.description];
      
      try {
        await pool.query(query, valori);
      } catch (err) {
        console.error("Errore riga:", riga, err.message);
      }
    }
    
    console.log('Importazione completata con successo!');
    pool.end();
  });