import { useState, useRef } from 'react';
import { Upload, Download, Trash2, Loader } from 'lucide-react';
import ImageService from '../services/imageService';
import './ImageUploader.css';

export function ImageUploader() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [width, setWidth] = useState(200);
  const [height, setHeight] = useState(200);
  const [processedImage, setProcessedImage] = useState(null);
  // idle | uploading | processing | done | error
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const isProcessing = status === 'uploading' || status === 'processing';
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  // Validación de dimensiones
  const MIN_DIMENSION = 1;
  const MAX_DIMENSION = 4096;

  const isValidDimension = (value) => {
    const num = parseInt(value, 10);
    return !isNaN(num) && num >= MIN_DIMENSION && num <= MAX_DIMENSION;
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar que sea imagen
    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen');
      return;
    }

    setError(null);
    setSelectedFile(file);

    // Crear preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleProcess = async () => {
    if (!selectedFile) {
      setError('Selecciona una imagen primero');
      return;
    }

    if (!isValidDimension(width) || !isValidDimension(height)) {
      setError(
        `Las dimensiones deben estar entre ${MIN_DIMENSION} y ${MAX_DIMENSION}`
      );
      return;
    }

    setStatus('uploading');
    setError(null);

    try {
      const blob = await ImageService.processImage(
        selectedFile,
        parseInt(width, 10),
        parseInt(height, 10),
        (step) => setStatus(step)
      );

      setProcessedImage(blob);
      setStatus('done');
    } catch (err) {
      setError(err.message || 'Error al procesar la imagen');
      setStatus('error');
      console.error(err);
    }
  };

  const handleDownload = () => {
    if (!processedImage) return;

    const url = ImageService.blobToUrl(processedImage);
    const link = document.createElement('a');
    link.href = url;
    const ext = selectedFile?.name.split('.').pop()?.toLowerCase() || 'jpg';
    link.download = `resized-${width}x${height}-${Date.now()}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    ImageService.revokeUrl(url);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setProcessedImage(null);
    setPreviewUrl(null);
    setError(null);
    setWidth(200);
    setHeight(200);
    setStatus('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="image-uploader">
      <div className="uploader-container">
        {/* Sección de carga */}
        <div className="upload-section">
          <h2>Cargar imagen</h2>

          <div className="file-input-wrapper">
            <input
              ref={fileInputRef}
              id="file-input"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={isProcessing}
              className="file-input"
            />
            <label htmlFor="file-input" className="file-input-label">
              <Upload size={24} />
              <span>{selectedFile ? selectedFile.name : 'Selecciona una imagen'}</span>
            </label>
          </div>

          {/* Preview de imagen original */}
          {previewUrl && (
            <div className="preview-container">
              <h3>Preview original</h3>
              <img src={previewUrl} alt="Preview" className="preview-image" />
            </div>
          )}
        </div>

        {/* Sección de controles */}
        <div className="controls-section">
          <h2>Dimensiones</h2>

          <div className="dimension-controls">
            <div className="dimension-group">
              <label htmlFor="width">Ancho (px)</label>
              <input
                id="width"
                type="number"
                min={MIN_DIMENSION}
                max={MAX_DIMENSION}
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                disabled={isProcessing}
              />
            </div>

            <div className="dimension-group">
              <label htmlFor="height">Alto (px)</label>
              <input
                id="height"
                type="number"
                min={MIN_DIMENSION}
                max={MAX_DIMENSION}
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                disabled={isProcessing}
              />
            </div>
          </div>

          {/* Errores */}
          {error && <div className="error-message">{error}</div>}

          {/* Botones de acción */}
          <div className="action-buttons">
            <button
              onClick={handleProcess}
              disabled={isProcessing || !selectedFile}
              className="btn btn-primary"
            >
              {isProcessing ? (
                <>
                  <Loader size={18} className="spinner" />
                  {status === 'uploading' ? 'Subiendo a S3...' : 'Procesando...'}
                </>
              ) : (
                'Redimensionar'
              )}
            </button>

            <button
              onClick={handleReset}
              disabled={isProcessing}
              className="btn btn-secondary"
            >
              <Trash2 size={18} />
              Limpiar
            </button>
          </div>
        </div>

        {/* Sección de resultado */}
        {processedImage && (
          <div className="result-section">
            <h2>Imagen redimensionada</h2>

            <div className="preview-container">
              <img
                src={URL.createObjectURL(processedImage)}
                alt="Processed"
                className="preview-image"
              />
              <p className="result-info">
                {width} × {height}px
              </p>
            </div>

            <button onClick={handleDownload} className="btn btn-primary full-width">
              <Download size={18} />
              Descargar imagen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ImageUploader;
