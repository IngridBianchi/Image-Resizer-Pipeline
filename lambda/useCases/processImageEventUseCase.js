class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = 400;
  }
}

const DEFAULT_DIMENSION = 200;
const MAX_DIMENSION = 4096;

function parseDimension(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_DIMENSION) {
    throw new ValidationError(
      `Dimensiones inválidas. width y height deben ser enteros entre 1 y ${MAX_DIMENSION}.`
    );
  }

  return parsed;
}

function normalizeEvent(event) {
  if (event && Array.isArray(event.Records) && event.Records.length > 0) {
    return event.Records.map((record) => {
      if (!record.s3 || !record.s3.bucket || !record.s3.object) {
        throw new ValidationError("Evento S3 inválido: faltan datos de bucket u objeto.");
      }

      return {
        bucket: record.s3.bucket.name,
        key: decodeURIComponent(record.s3.object.key.replace(/\+/g, " ")),
      };
    });
  }

  if (event && event.bucket && event.key) {
    return [{ bucket: event.bucket, key: event.key }];
  }

  throw new ValidationError("Evento inválido: se esperaba Records[] de S3 o bucket/key.");
}

function inferContentType(key) {
  const lowered = key.toLowerCase();

  if (lowered.endsWith(".png")) return "image/png";
  if (lowered.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

class ProcessImageEventUseCase {
  constructor({ storageService, imageProcessor, outputBucket, logger = console }) {
    this.storageService = storageService;
    this.imageProcessor = imageProcessor;
    this.outputBucket = outputBucket;
    this.logger = logger;
  }

  async execute(event) {
    if (!this.outputBucket) {
      throw new Error("OUTPUT_BUCKET no está definido.");
    }

    const width = parseDimension(event?.width, DEFAULT_DIMENSION);
    const height = parseDimension(event?.height, DEFAULT_DIMENSION);
    const records = normalizeEvent(event);

    const processed = [];

    for (const item of records) {
      const originalImage = await this.storageService.download(item.bucket, item.key);
      const resizedImage = await this.imageProcessor.resize(originalImage, { width, height });

      const outputKey = `resized/${width}x${height}/${item.key}`;
      const contentType = inferContentType(item.key);

      await this.storageService.upload(
        this.outputBucket,
        outputKey,
        resizedImage,
        contentType
      );

      this.logger.log(
        `Imagen redimensionada guardada en ${this.outputBucket}/${outputKey}`
      );

      processed.push({
        inputBucket: item.bucket,
        inputKey: item.key,
        outputKey,
        width,
        height,
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Resize exitoso",
        processedCount: processed.length,
        items: processed,
      }),
    };
  }
}

module.exports = {
  ProcessImageEventUseCase,
  ValidationError,
};
