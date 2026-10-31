/**
 * Carga de archivos GeoJSON desde el disco del usuario.
 * Todo el procesamiento es local: el archivo nunca se envía a servicios externos.
 */

/** Tamaño máximo aceptado (20 MB) para evitar bloqueos del navegador. */
export const MAX_FILE_SIZE = 20 * 1024 * 1024;

/**
 * Lee un File como texto con validaciones básicas.
 * Devuelve { ok, text?, error? }.
 */
export function readGeoJsonFile(file) {
  return new Promise((resolve) => {
    if (!file) {
      resolve({ ok: false, error: 'No se seleccionó ningún archivo.' });
      return;
    }
    const nameOk = /\.(geojson|json)$/i.test(file.name);
    if (!nameOk) {
      resolve({ ok: false, error: 'El archivo debe tener extensión .geojson o .json.' });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      resolve({ ok: false, error: `El archivo supera el tamaño máximo admitido (${Math.round(MAX_FILE_SIZE / 1024 / 1024)} MB).` });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve({ ok: true, text: String(reader.result) });
    reader.onerror = () => resolve({ ok: false, error: 'No se pudo leer el archivo.' });
    reader.readAsText(file, 'utf-8');
  });
}
