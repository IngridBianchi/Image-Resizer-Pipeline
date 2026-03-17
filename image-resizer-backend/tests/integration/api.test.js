const { createHandler } = require("../../lambda/handler");

describe("Lambda handler integration", () => {
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
		mockGetMetadata.mockResolvedValue({});
	});

	test("procesa un evento S3 y sube imagen redimensionada", async () => {
		const original = Buffer.from("original-image");
		const resized = Buffer.from("resized-image");

		mockDownload.mockResolvedValueOnce(original);
		mockResize.mockResolvedValueOnce(resized);
		mockUpload.mockResolvedValueOnce(undefined);

		const event = {
			Records: [
				{
					s3: {
						bucket: { name: "input-bucket" },
						object: { key: "Ingrid.png" },
					},
				},
			],
		};

		const response = await handler(event);

		expect(mockDownload).toHaveBeenCalledWith("input-bucket", "Ingrid.png");
		expect(mockResize).toHaveBeenCalledWith(original, { width: 200, height: 200 });
		expect(mockUpload).toHaveBeenCalledWith(
			"output-bucket",
			"resized/200x200/Ingrid.png",
			resized,
			"image/png"
		);
		expect(response.statusCode).toBe(200);
	});

	test("procesa múltiples records de S3", async () => {
		const original = Buffer.from("img");
		const resized = Buffer.from("img-resized");

		mockDownload.mockResolvedValue(original);
		mockResize.mockResolvedValue(resized);
		mockUpload.mockResolvedValue(undefined);

		const response = await handler({
			Records: [
				{
					s3: {
						bucket: { name: "input-bucket" },
						object: { key: "a.png" },
					},
				},
				{
					s3: {
						bucket: { name: "input-bucket" },
						object: { key: "b.jpg" },
					},
				},
			],
		});

		expect(mockDownload).toHaveBeenCalledTimes(2);
		expect(mockUpload).toHaveBeenCalledTimes(2);
		expect(JSON.parse(response.body).processedCount).toBe(2);
	});

	test("devuelve 400 cuando width es inválido", async () => {
		const response = await handler({
			bucket: "input-bucket",
			key: "test.jpg",
			width: 0,
			height: 100,
		});

		expect(response.statusCode).toBe(400);
		expect(mockDownload).not.toHaveBeenCalled();
	});

	test("extrae dimensiones de la clave S3 en formato {uuid}/{W}x{H}/{filename}", async () => {
		const original = Buffer.from("original-image");
		const resized = Buffer.from("resized-image");

		mockDownload.mockResolvedValueOnce(original);
		mockResize.mockResolvedValueOnce(resized);
		mockUpload.mockResolvedValueOnce(undefined);

		const inputKey = "abc123/640x480/photo.jpg";
		const event = {
			Records: [
				{
					s3: {
						bucket: { name: "input-bucket" },
						object: { key: inputKey },
					},
				},
			],
		};

		const response = await handler(event);

		expect(mockGetMetadata).not.toHaveBeenCalled();
		expect(mockResize).toHaveBeenCalledWith(original, { width: 640, height: 480 });
		expect(mockUpload).toHaveBeenCalledWith(
			"output-bucket",
			`resized/640x480/${inputKey}`,
			resized,
			"image/jpeg"
		);
		expect(response.statusCode).toBe(200);
	});
});
