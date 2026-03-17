const { ImageService } = require("../../lambda/services/imageService");
const sharp = require("sharp");

describe("ImageService", () => {
  let imageService;
  let sampleBuffer;

  beforeAll(async () => {
    imageService = new ImageService();
    // Creamos un buffer de imagen simple (ej. PNG 50x50 rojo)
    sampleBuffer = await sharp({
      create: {
        width: 50,
        height: 50,
        channels: 3,
        background: { r: 255, g: 0, b: 0 }
      }
    }).png().toBuffer();
  });

  test("resize debe devolver imagen con dimensiones correctas", async () => {
    const resized = await imageService.resize(sampleBuffer, { width: 20, height: 20 });
    const metadata = await sharp(resized).metadata();

    expect(metadata.width).toBe(20);
    expect(metadata.height).toBe(20);
  });

  test("resize debe lanzar error si faltan parámetros", async () => {
    await expect(imageService.resize(sampleBuffer, {}))
      .rejects
      .toThrow("Width y height deben ser enteros positivos para el resize");
  });

  test("resize debe lanzar error si imageBuffer no es buffer", async () => {
    await expect(imageService.resize("not-buffer", { width: 20, height: 20 }))
      .rejects
      .toThrow("imageBuffer debe ser un Buffer válido");
  });
});