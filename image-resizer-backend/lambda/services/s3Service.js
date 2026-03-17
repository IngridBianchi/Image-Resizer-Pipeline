const { GetObjectCommand, PutObjectCommand, HeadObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const { IStorageService } = require("../interfaces/IStorageService");

class S3Service extends IStorageService {
  constructor(s3Client = new S3Client({})) {
    super();
    this.s3 = s3Client;
  }

  /**
   * Descarga un objeto desde S3
   * @param {string} bucket - Nombre del bucket
   * @param {string} key - Clave del objeto
   * @returns {Buffer} Contenido del objeto
   */
  async download(bucket, key) {
    const result = await this.s3.send(
      new GetObjectCommand({ Bucket: bucket, Key: key })
    );

    if (!result.Body) {
      throw new Error("El objeto descargado no contiene body");
    }

    const bytes = await result.Body.transformToByteArray();
    return Buffer.from(bytes);
  }

  /**
   * Sube un objeto a S3
   * @param {string} bucket - Nombre del bucket
   * @param {string} key - Clave del objeto
   * @param {Buffer} body - Contenido a subir
   * @param {string} contentType - Tipo MIME
   */
  async upload(bucket, key, body, contentType) {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType
      })
    );
  }

  /**
   * Obtiene los metadatos de un objeto en S3
   * @param {string} bucket - Nombre del bucket
   * @param {string} key - Clave del objeto
   * @returns {Object} Metadatos del objeto (puede estar vacío)
   */
  async getMetadata(bucket, key) {
    const result = await this.s3.send(
      new HeadObjectCommand({ Bucket: bucket, Key: key })
    );
    return result.Metadata || {};
  }
}

module.exports = { S3Service };