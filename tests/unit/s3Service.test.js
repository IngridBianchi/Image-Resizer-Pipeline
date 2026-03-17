const { S3Service } = require("../../lambda/services/s3Service");
const { GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");

describe("S3Service", () => {
  let s3Service;
  let mockS3;

  beforeEach(() => {
    mockS3 = {
      send: jest.fn()
    };
    s3Service = new S3Service(mockS3);
  });

  test("download debe devolver buffer", async () => {
    const fakeBuffer = Buffer.from("test");
    mockS3.send.mockResolvedValueOnce({
      Body: {
        transformToByteArray: jest.fn().mockResolvedValueOnce(fakeBuffer)
      }
    });

    const result = await s3Service.download("bucket", "key");
    expect(result).toEqual(fakeBuffer);
    expect(mockS3.send).toHaveBeenCalledWith(
      expect.objectContaining({
        input: { Bucket: "bucket", Key: "key" }
      })
    );
    expect(mockS3.send.mock.calls[0][0]).toBeInstanceOf(GetObjectCommand);
  });

  test("upload debe llamar a putObject con parámetros correctos", async () => {
    mockS3.send.mockResolvedValueOnce({});
    const fakeBuffer = Buffer.from("test");

    await s3Service.upload("bucket", "key", fakeBuffer, "image/jpeg");
    expect(mockS3.send).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          Bucket: "bucket",
          Key: "key",
          Body: fakeBuffer,
          ContentType: "image/jpeg"
        }
      })
    );
    expect(mockS3.send.mock.calls[0][0]).toBeInstanceOf(PutObjectCommand);
  });

  test("download debe lanzar error si S3 responde sin body", async () => {
    mockS3.send.mockResolvedValueOnce({});

    await expect(s3Service.download("bucket", "key"))
      .rejects
      .toThrow("El objeto descargado no contiene body");
  });
});
