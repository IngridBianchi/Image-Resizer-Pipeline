const { createHandler } = require("../../lambda/handler");

describe("S3 event contract", () => {
  const mockDownload = jest.fn();
  const mockUpload = jest.fn();
  const mockGetMetadata = jest.fn();
  const mockResize = jest.fn();
  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
  };

  const handler = createHandler({
    storageService: {
      download: mockDownload,
      upload: mockUpload,
      getMetadata: mockGetMetadata,
    },
    imageProcessor: {
      resize: mockResize,
    },
    logger: mockLogger,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OUTPUT_BUCKET = "output-bucket";
    mockDownload.mockResolvedValue(Buffer.from("original"));
    mockResize.mockResolvedValue(Buffer.from("resized"));
    mockUpload.mockResolvedValue(undefined);
    // Por defecto retorna metadata vacía (usa dimensiones predeterminadas 200x200)
    mockGetMetadata.mockResolvedValue({});
  });

  test("decodifica claves con subcarpetas, espacios y caracteres especiales", async () => {
    const event = {
      Records: [
        {
          s3: {
            bucket: { name: "input-bucket" },
            object: {
              key: "folder+one%2Falbum%2FImage+%231+%281%29.png",
            },
          },
        },
      ],
    };

    const response = await handler(event);

    expect(mockDownload).toHaveBeenCalledWith(
      "input-bucket",
      "folder one/album/Image #1 (1).png"
    );
    expect(mockUpload).toHaveBeenCalledWith(
      "output-bucket",
      "resized/200x200/folder one/album/Image #1 (1).png",
      expect.any(Buffer),
      "image/png"
    );
    expect(response.statusCode).toBe(200);
  });

  test("preserva extensión webp y parámetros explícitos al procesar evento S3", async () => {
    const event = {
      width: 320,
      height: 240,
      Records: [
        {
          s3: {
            bucket: { name: "input-bucket" },
            object: {
              key: "gallery%2Fproduct-shot%2Fhero-image.webp",
            },
          },
        },
      ],
    };

    await handler(event);

    expect(mockResize).toHaveBeenCalledWith(expect.any(Buffer), {
      width: 320,
      height: 240,
    });
    expect(mockUpload).toHaveBeenCalledWith(
      "output-bucket",
      "resized/320x240/gallery/product-shot/hero-image.webp",
      expect.any(Buffer),
      "image/webp"
    );
  });
});