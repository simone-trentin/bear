import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css'; // <-- IL FIX PER LA MAPPA ROTTA È QUI
import './App.css';

// Componente per gestire i click sulla mappa
function LocationMarker({ onAddSighting }) {
  useMapEvents({
    click(e) {
      onAddSighting(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function App() {
  const [sightings, setSightings] = useState([]);

  // 1. All'avvio, recupera gli avvistamenti dal backend (Node.js)
  useEffect(() => {
    fetch('http://localhost:3000/api/sightings')
      .then((res) => res.json())
      .then((data) => setSightings(data))
      .catch((err) => console.error("Errore nel caricamento:", err));
  }, []);

  // 2. Funzione per salvare un nuovo avvistamento
  const addSighting = async (lat, lng) => {
    try {
      const response = await fetch('http://localhost:3000/api/sightings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });
      const newSighting = await response.json();
      setSightings([...sightings, newSighting]);
    } catch (err) {
      console.error("Errore nel salvataggio:", err);
    }
  };

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <h1 style={{ position: 'absolute', zIndex: 1000, background: 'white', padding: '10px', margin: '10px', borderRadius: '5px', border: '2px solid black' }}>
        --- Bear Tracker - Verona
      </h1>
      
      {/* Mappa centrata su Verona */}
      <MapContainer center={[45.4384, 10.9916]} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap'
        />
        <LocationMarker onAddSighting={addSighting} />
        
        {/* Mostra tutti i pin degli orsi salvati */}
        {sightings.map((bear) => (
          <Marker key={bear.id} position={[bear.latitude, bear.longitude]}>
            <Popup>
              <strong>Avvistamento #{bear.id}</strong><br />
              Data: {new Date(bear.timestamp).toLocaleString()}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default App;