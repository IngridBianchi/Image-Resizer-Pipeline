/**
 * Servicio S3-driven para redimensionamiento de imágenes.
 *
 * Flujo:
 *  1. Solicita una presigned PUT URL al servidor local (presign-server).
 *  2. Sube el archivo directamente a S3 vía esa URL, con metadatos width/height.
 *  3. El evento S3 dispara la Lambda que redimensiona y guarda en el bucket de salida.
 *  4. Consulta (polling) al presign-server hasta que el resultado esté disponible.
 *  5. Devuelve el blob de la imagen redimensionada.
 */

const PRESIGN_URL = import.meta.env.VITE_PRESIGN_URL || 'http://localhost:3001';

export class ImageService {
  /**
   * Procesa una imagen usando el flujo S3-driven completo.
   * @param {File} file - Archivo de imagen a redimensionar
   * @param {number} width - Ancho deseado en píxeles
   * @param {number} height - Alto deseado en píxeles
   * @param {Function} onStatus - Callback de estado: 'uploading' | 'processing'
   * @returns {Promise<Blob>} Imagen redimensionada
   */
  static async processImage(file, width, height, onStatus = () => {}) {
    onStatus('uploading');

    // Paso 1: obtener presigned PUT URL
    const presignRes = await fetch(`${PRESIGN_URL}/api/presign-upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        width,
        height,
      }),
    });

    if (!presignRes.ok) {
      const errData = await presignRes.json().catch(() => ({}));
      throw new Error(errData.message || 'Error al obtener URL de carga');
    }

    const { uploadUrl, outputKey } = await presignRes.json();

    // Paso 2: subir el archivo directamente a S3.
    // Las dimensiones están codificadas en la clave, no se necesitan cabeceras personalizadas.
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!uploadRes.ok) {
      throw new Error(`Error al subir imagen a S3 (${uploadRes.status})`);
    }

    onStatus('processing');

    // Paso 3: esperar y obtener el resultado
    return ImageService._pollForResult(outputKey);
  }

  /**
   * Consulta periódicamente si el objeto de salida ya existe en S3.
   * @param {string} outputKey - Clave del objeto en el bucket de salida
   * @param {number} maxAttempts - Intentos máximos (default 20 = ~40s)
   * @param {number} intervalMs - Espera entre intentos en ms (default 2000)
   * @returns {Promise<Blob>} Blob de la imagen redimensionada
   */
  static async _pollForResult(outputKey, maxAttempts = 20, intervalMs = 2000) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));

      const res = await fetch(
        `${PRESIGN_URL}/api/presign-download?key=${encodeURIComponent(outputKey)}`
      );

      if (res.ok) {
        const { downloadUrl } = await res.json();
        const imgRes = await fetch(downloadUrl);
        if (imgRes.ok) return imgRes.blob();
      }

      if (res.status !== 404) {
        throw new Error('Error al verificar el resultado en S3');
      }
    }

    throw new Error('Tiempo de espera agotado: el procesamiento tardó demasiado');
  }

  static blobToUrl(blob) {
    return URL.createObjectURL(blob);
  }

  static revokeUrl(url) {
    URL.revokeObjectURL(url);
  }
}

export default ImageService;
