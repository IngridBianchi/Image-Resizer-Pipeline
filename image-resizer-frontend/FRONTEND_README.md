# Image Resizer Frontend

Frontend React + Vite para el servicio de redimensionamiento de imágenes de AWS Lambda.

## Características

- 📤 Carga de imágenes (PNG, JPEG, WebP)
- 📐 Control dinámico de dimensiones (ancho x alto)
- 🎨 Interfaz moderna con Tailwind CSS
- 📱 Diseño responsive
- ⚡ Vite con HMR (Hot Module Replacement)

## Instalación

```bash
npm install
```

## Configuración

### Variables de entorno

Copia `.env.example` a `.env.local` y configura la URL del backend:

```bash
cp .env.example .env.local
```

```env
VITE_API_URL=https://tu-api-gateway-url.com
```

Si no especificas `VITE_API_URL`, el frontend intentará conectar a `http://localhost:3000`.

## Desarrollo

```bash
npm run dev
```

El servidor se iniciará en `http://localhost:5173`.

## Build

```bash
npm run build
```

Los archivos compilados se generarán en la carpeta `dist/`.

## Estructura del frontend

```
src/
├── components/
│   ├── ImageUploader.jsx    # Componente principal
│   └── ImageUploader.css    # Estilos
├── services/
│   └── imageService.js      # Servicio de API
├── App.jsx                  # Componente raíz
├── App.css                  # Estilos globales
├── index.css                # Reset CSS
└── main.jsx                 # Punto de entrada
```

## API esperada

El frontend espera un backend con los siguientes endpoints:

### POST /resize

Procesa una imagen con redimensionamiento.

**Request:**
```
Content-Type: multipart/form-data

- image: File (imagen a procesar)
- width: number (ancho en píxeles, 1-4096)
- height: number (alto en píxeles, 1-4096)
```

**Response (exitosa):**
```
Content-Type: image/jpeg (o image/png, image/webp según formato original)
Status: 200

[imagen procesada en binario]
```

**Response (error):**
```
Content-Type: application/json
Status: 400 | 500

{
  "message": "Descripción del error",
  "error": "Detalles técnicos"
}
```

## Notas de integración con el backend

**Para que el frontend funcione, necesitas:**

1. **API Gateway o servidor Express/Node.js** que exponga el endpoint `POST /resize`
2. El endpoint debe aceptar `FormData` con `image`, `width` y `height`
3. El endpoint debe delegar a la Lambda de AWS para procesar la imagen
4. La respuesta debe ser la imagen redimensionada en binario

### Ejemplo de implementación mínima (Node.js/Express)

```javascript
const express = require('express');
const AWS = require('@aws-sdk/client-lambda');
const app = express();

app.use(express.json());

const lambda = new AWS.Lambda({ region: 'us-east-1' });

app.post('/resize', async (req, res) => {
  try {
    const { image, width, height } = req.body;
    
    // Invocar Lambda
    const response = await lambda.invoke({
      FunctionName: 'image-resizer-lambda',
      Payload: JSON.stringify({
        bucket: 'input-bucket',
        key: 'image.jpg',
        width,
        height
      })
    });

    const result = JSON.parse(response.Payload);
    res.status(200).send(result); // Imagen procesada
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.listen(3000);
```

## Tecnologías

- **React 19** - Framework UI
- **Vite** - Build tool
- **Tailwind CSS** - Utilidades CSS
- **Lucide React** - Iconos
- **AWS SDK** - Integración con AWS (si aplica)

## Linting

```bash
npm run lint
```

## Logs

El servicio registra en la consola del navegador (DevTools).
