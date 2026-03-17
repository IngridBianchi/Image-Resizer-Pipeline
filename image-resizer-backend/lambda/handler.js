const { S3Service } = require("./services/s3Service");
const { ImageService } = require("./services/imageService");
const {
  ProcessImageEventUseCase,
  ValidationError,
} = require("./useCases/processImageEventUseCase");

function createHandler({ storageService, imageProcessor, logger = console } = {}) {
  return async (event) => {
    try {
      const useCase = new ProcessImageEventUseCase({
        storageService: storageService || new S3Service(),
        imageProcessor: imageProcessor || new ImageService(),
        outputBucket: process.env.OUTPUT_BUCKET,
        logger,
      });

      return await useCase.execute(event);
    } catch (error) {
      logger.error("Error al procesar imagen:", error);

      const statusCode = error instanceof ValidationError ? error.statusCode : 500;
      const message =
        statusCode === 500 ? "Error al procesar imagen" : error.message;

      return {
        statusCode,
        body: JSON.stringify({
          message,
          error: error.message,
        }),
      };
    }
  };
}

exports.createHandler = createHandler;
exports.handler = createHandler();