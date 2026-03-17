require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const { randomUUID } = require('crypto');
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));

const INPUT_BUCKET = process.env.INPUT_BUCKET;
const OUTPUT_BUCKET = process.env.OUTPUT_BUCKET;
const PORT = process.env.PORT || 3001;

if (!INPUT_BUCKET || !OUTPUT_BUCKET) {
  console.error('ERROR: INPUT_BUCKET y OUTPUT_BUCKET deben estar definidos en las variables de entorno.');
  process.exit(1);
}

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

/**
 * POST /api/presign-upload
 * Body: { filename, contentType, width, height }
 * Returns: { uploadUrl, key, outputKey }
 *
 * Genera una presigned PUT URL para que el navegador suba
 * directamente al bucket de entrada, incluyendo los metadatos
 * x-amz-meta-width y x-amz-meta-height en la firma.
 */
app.post('/api/presign-upload', async (req, res) => {
  const { filename, contentType, width, height } = req.body;

  if (!filename || !contentType || width == null || height == null) {
    return res.status(400).json({
      message: 'filename, contentType, width y height son requeridos',
    });
  }

  const parsedWidth = parseInt(width, 10);
  const parsedHeight = parseInt(height, 10);
  if (!Number.isInteger(parsedWidth) || parsedWidth < 1 ||
      !Number.isInteger(parsedHeight) || parsedHeight < 1) {
    return res.status(400).json({ message: 'width y height deben ser enteros positivos' });
  }

  // Sanitizar nombre de archivo para evitar path traversal
  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  // Las dimensiones van codificadas en la clave: {uuid}/{W}x{H}/{filename}
  // Así el navegador solo necesita enviar Content-Type, sin cabeceras personalizadas.
  const key = `${randomUUID()}/${parsedWidth}x${parsedHeight}/${safeFilename}`;

  const command = new PutObjectCommand({
    Bucket: INPUT_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  // outputKey debe coincidir con la fórmula del use case: resized/${W}x${H}/${inputKey}
  const outputKey = `resized/${parsedWidth}x${parsedHeight}/${key}`;

  return res.json({ uploadUrl, key, outputKey });
});

/**
 * GET /api/presign-download?key=...
 * Returns: { downloadUrl } si el objeto existe, 404 si aún no está listo
 *
 * Comprueba si el objeto existe en el bucket de salida y,
 * si es así, devuelve una presigned GET URL para descargarlo.
 */
app.get('/api/presign-download', async (req, res) => {
  const { key } = req.query;

  if (!key) {
    return res.status(400).json({ message: 'El parámetro key es requerido' });
  }

  try {
    await s3.send(new HeadObjectCommand({ Bucket: OUTPUT_BUCKET, Key: key }));
  } catch (err) {
    const httpStatus = err.$metadata?.httpStatusCode;
    if (httpStatus === 404 || err.name === 'NotFound' || err.name === 'NoSuchKey') {
      return res.status(404).json({ message: 'Imagen aún no disponible' });
    }
    console.error('Error al verificar objeto de salida:', err);
    return res.status(500).json({ message: 'Error al verificar resultado' });
  }

  const command = new GetObjectCommand({ Bucket: OUTPUT_BUCKET, Key: key });
  const downloadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

  return res.json({ downloadUrl });
});

app.listen(PORT, () => {
  console.log(`Presign server corriendo en http://localhost:${PORT}`);
 // console.log(`  INPUT_BUCKET:  ${INPUT_BUCKET}`);
 // console.log(`  OUTPUT_BUCKET: ${OUTPUT_BUCKET}`);
});
