import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';

window.L = L;
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet/dist/leaflet.css';
import './App.css';

function LocationMarker({ onAddSighting }) {
  useMapEvents({
    click(e) {
      onAddSighting(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Strumenti di disegno aggiornati: no rettangolo, no cestino nativo
function DrawControl({ polygon, onPolygonCreated }) {
  const map = useMap();
  const [drawnItems] = useState(() => new L.FeatureGroup());

  useEffect(() => {
    map.addLayer(drawnItems);

    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        polyline: false, circle: false, circlemarker: false, marker: false,
        rectangle: false, // Rettangolo disabilitato
        polygon: true,
      },
      // Cestino nativo rimosso
    });
    map.addControl(drawControl);

    const handleDrawCreated = (e) => {
      drawnItems.clearLayers(); // Tiene solo l'ultima forma
      drawnItems.addLayer(e.layer);
      onPolygonCreated(e.layer.toGeoJSON().geometry);
    };

    map.on(L.Draw.Event.CREATED, handleDrawCreated);

    return () => {
      map.removeControl(drawControl);
      map.removeLayer(drawnItems);
      map.off(L.Draw.Event.CREATED, handleDrawCreated);
    };
  }, [map, drawnItems, onPolygonCreated]);

  // Ascolta il tasto "Cancella Area" dal pannello React
  useEffect(() => {
    if (!polygon) drawnItems.clearLayers();
  }, [polygon, drawnItems]);

  return null;
}

function App() {
  const [sightings, setSightings] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [polygon, setPolygon] = useState(null);

  // Funzione di ricerca che chiama la nuova POST API
  const handleSearch = async () => {
    // Blocco: se non c'è né data né poligono, ci fermiamo qui
    if (!startDate && !endDate && !polygon) {
      alert("Seleziona un'area sulla mappa o inserisci un periodo di tempo per cercare.");
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/sightings/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, polygon }),
      });
      const data = await response.json();
      setSightings(data);
    } catch (err) {
      console.error("Errore nella ricerca:", err);
    }
  };

  return (
    <div style={{ height: '100vh', width: '100vw', position: 'relative' }}>
      
      {/* Pannello UI */}
      <div style={{ position: 'absolute', top: 90, left: 20, zIndex: 1000, background: 'white', padding: '15px', borderRadius: '5px', border: '2px solid black' }}>
        <h2 style={{ margin: '0 0 10px 0' }}>Bear Tracker</h2>
        
        <div>
          <label>Da: </label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div style={{ marginTop: '5px', marginBottom: '10px' }}>
          <label>A:&nbsp;&nbsp;&nbsp;</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        
        {/* Mostra il tasto di cancellazione solo se c'è un poligono */}
        {polygon && (
          <button 
            style={{ width: '100%', padding: '8px', background: '#d32f2f', color: 'white', fontWeight: 'bold', cursor: 'pointer', border: 'none', borderRadius: '3px', marginBottom: '10px' }} 
            onClick={() => setPolygon(null)}
          >
            CANCELLA AREA
          </button>
        )}

        {/* Bottone di ricerca */}
        <button 
          style={{ width: '100%', padding: '8px', background: '#4CAF50', color: 'white', fontWeight: 'bold', cursor: 'pointer', border: 'none', borderRadius: '3px' }} 
          onClick={handleSearch}
        >
          CERCA AVVISTAMENTI
        </button>
        
        {/* Contatore risultati */}
        <div style={{ marginTop: '10px', fontSize: '0.9em', color: 'gray' }}>
          Risultati: {sightings.length}
        </div>
      </div>
      
      <MapContainer center={[43.0618, 141.3545]} zoom={10} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <DrawControl polygon={polygon} onPolygonCreated={setPolygon} />
        
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