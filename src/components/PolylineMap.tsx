import 'leaflet/dist/leaflet.css'
import {MapContainer, Polyline, TileLayer} from 'react-leaflet';

const PolylineMap = () => {
  return (
    <MapContainer
      center={[40.7317535212683, -73.99685430908403]}
      zoom={13}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Polyline
        pathOptions={{fillColor: 'red', color: 'blue'}}
        positions={[
          [40.689818841705, -74.04511194542516],
          [40.75853187779803, -73.98495720388513],
          [40.86151538060051, -74.06201170384256],
          [40.80981015620906, -74.03656769139772],
          [40.80721155324825, -74.04274750092904],
          [40.78901848327006, -74.081199649124],
          [40.764319913561216, -74.08840942691056],
          [40.749756455072884, -74.09493255919364],
          [40.74793579843903, -74.07673645335137],
          [40.675849802727335, -74.19758606169779],
          [40.60394644123212, -74.05991363796608],
          [40.6495463256113, -73.96000671720954],
        ]}
      />
    </MapContainer>
  );
};

export {PolylineMap};
