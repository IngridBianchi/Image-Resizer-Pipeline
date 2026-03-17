/**
 * Interfaz para procesadores de imágenes
 * Define las operaciones que cualquier servicio de imágenes debe implementar.
 */
class IImageProcessor {
  /**
   * Redimensiona una imagen
   * @param {Buffer} imageBuffer - Imagen original en buffer
   * @param {Object} options - Opciones de resize { width, height }
   * @returns {Buffer} Imagen transformada
   */
  async resize(imageBuffer, options) {
    throw new Error("Método 'resize' debe ser implementado");
  }
}

module.exports = { IImageProcessor };