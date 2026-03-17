const sharp = require("sharp");
const { IImageProcessor } = require("../interfaces/IImageProcessor");

class ImageService extends IImageProcessor {
  /**
   * Redimensiona una imagen usando Sharp
   * @param {Buffer} imageBuffer - Imagen original en buffer
   * @param {Object} options - Opciones de resize { width, height }
   * @returns {Buffer} Imagen redimensionada
   */
  async resize(imageBuffer, options) {
    if (!Buffer.isBuffer(imageBuffer)) {
      throw new Error("imageBuffer debe ser un Buffer válido");
    }

    const { width, height } = options || {};
    const isValidDimension = (value) => Number.isInteger(value) && value > 0;

    if (!isValidDimension(width) || !isValidDimension(height)) {
      throw new Error("Width y height deben ser enteros positivos para el resize");
    }

    return await sharp(imageBuffer)
      .resize(width, height)
      .toBuffer();
  }
}

module.exports = { ImageService };