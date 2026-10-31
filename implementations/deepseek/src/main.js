import 'maplibre-gl/dist/maplibre-gl.css';
import './styles.css';
import { initApp } from './ui/app.js';

initApp().catch((error) => {
  console.error('Fallo al inicializar Quito Cadastre Quality Lab:', error);
  const banner = document.getElementById('app-error');
  if (banner) {
    banner.hidden = false;
    banner.textContent = `No se pudo inicializar la aplicación: ${error.message}`;
  }
});
