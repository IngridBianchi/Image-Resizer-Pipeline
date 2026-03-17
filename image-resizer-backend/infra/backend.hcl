bucket         = "image-resizer-terraform-state-204098850659-us-east-1"
key            = "image-resizer-pipeline/infra/terraform.tfstate"
region         = "us-east-1"
encrypt        = true
dynamodb_table = "image-resizer-terraform-locks"