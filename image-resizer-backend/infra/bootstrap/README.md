Bootstrap del backend remoto de Terraform.

Uso:

1. terraform init
2. terraform apply -auto-approve
3. En ../ ejecutar terraform init -migrate-state -backend-config=backend.hcl

Si la cuenta tiene permisos DynamoDB, se puede usar ../backend-dynamodb.hcl.example como base para el backend con locking en DynamoDB.
Para crear también la tabla DynamoDB desde bootstrap: terraform apply -auto-approve -var="enable_dynamodb_lock=true"

Recursos creados:

- Bucket S3 para state remoto.
- Tabla DynamoDB opcional para lock de Terraform.