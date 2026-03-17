/**
 * Interfaz para servicios de almacenamiento
 * Define las operaciones que cualquier servicio de almacenamiento debe implementar.
 */
class IStorageService {
  /**
   * Descarga un objeto desde el almacenamiento
   * @param {string} bucket - Nombre del bucket
   * @param {string} key - Clave del objeto
   * @returns {Buffer} Contenido del objeto
   */
  async download(bucket, key) {
    throw new Error("Método 'download' debe ser implementado");
  }

  /**
   * Sube un objeto al almacenamiento
   * @param {string} bucket - Nombre del bucket
   * @param {string} key - Clave del objeto
   * @param {Buffer} body - Contenido a subir
   * @param {string} contentType - Tipo MIME
   */
  async upload(bucket, key, body, contentType) {
    throw new Error("Método 'upload' debe ser implementado");
  }

  /**
   * Obtiene los metadatos de un objeto
   * @param {string} bucket - Nombre del bucket
   * @param {string} key - Clave del objeto
   * @returns {Object} Metadatos del objeto
   */
  async getMetadata(bucket, key) {
    throw new Error("Método 'getMetadata' debe ser implementado");
  }
}

module.exports = { IStorageService };