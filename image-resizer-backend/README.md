# Image Resizer Pipeline

Un proyecto **DevOps completo** que implementa un servicio de redimensionamiento de imágenes en **AWS Lambda**, con buckets S3 de entrada/salida, empaquetado automático, tests unitarios e integración, y despliegue mediante **Terraform** y **GitHub Actions**.

---

## 🚀 Arquitectura

- **Frontend / API Gateway** → envía parámetros dinámicos de redimensionamiento (`width`, `height`).
- **AWS S3 (input bucket)** → almacena imágenes originales.
- **AWS Lambda (Node.js 20)** → procesa imágenes con [Sharp](https://sharp.pixelplumbing.com/).
- **AWS S3 (output bucket)** → guarda imágenes redimensionadas.
- **Terraform** → define infraestructura como código.
- **GitHub Actions** → pipeline CI/CD (build → test → package → deploy).

---

## 📂 Estructura del proyecto

Image-Resizer-Pipeline/ 
├── .github/workflows/ci.yml   # Pipeline CI/CD 
├── infra/
│   ├── main.tf                # Infraestructura principal AWS con Terraform
│   ├── backend.hcl            # Backend remoto S3 + DynamoDB lock
│   └── bootstrap/             # Bootstrap del bucket de state y lock table
├── lambda/
│   ├── handler.js             # Orquestador Lambda
│   ├── services/              # Servicios (ImageService, S3Service)
│   ├── interfaces/            # Interfaces (IImageProcessor, IStorageService)
│   ├── useCases/              # Casos de uso y validación
│   ├── package.json           # Dependencias Node.js
│   └── dist/lambda.zip        # Artefacto empaquetado para despliegue
└── tests/
    ├── unit/                  # Tests unitarios
    ├── integration/           # Tests de integración
    └── contract/              # Contratos de eventos S3

---

## 🧪 Testing

- **Unit tests**: validan la lógica de `ImageService` y `S3Service`.
- **Integration tests**: simulan eventos S3 y verifican que la Lambda procese correctamente.
- **Contract tests**: validan el formato de eventos S3 con subcarpetas y caracteres especiales.

Ejecutar tests:

```bash
cd lambda
npm test
```

## Terraform Backend Remoto

El stack principal en `infra/` usa backend remoto S3 con bloqueo en DynamoDB.

Archivos relevantes:

- `infra/backend.hcl`: configuración activa del backend remoto.
- `infra/bootstrap/main.tf`: bootstrap del bucket S3 y la tabla DynamoDB de locking.

Bootstrap inicial del backend:

```bash
cd infra/bootstrap
terraform init
terraform apply -auto-approve

cd ../
terraform init -migrate-state -force-copy '-backend-config=backend.hcl'
```

Si necesitas crear o reconciliar explícitamente la tabla de locking desde bootstrap:

```bash
cd infra/bootstrap
terraform apply -auto-approve -var="enable_dynamodb_lock=true"
```

Trabajo diario sobre la infraestructura principal:

```bash
cd infra
terraform init -reconfigure '-backend-config=backend.hcl'
terraform plan
terraform apply -auto-approve
```

## Runtime y Build

- **Runtime AWS Lambda**: Node.js 20
- **Build image local/CI**: `public.ecr.aws/sam/build-nodejs20.x:latest`
- **Pipeline CI/CD**: GitHub Actions ejecuta tests y empaquetado con Node 20