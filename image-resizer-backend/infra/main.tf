terraform {
  backend "s3" {}
}

provider "aws" {
  region = "us-east-1"
}

locals {
  common_tags = {
    Project     = "image-resizer-pipeline"
    Environment = "dev"
    ManagedBy   = "terraform"
  }
}

# Sufijo aleatorio para evitar nombres duplicados
resource "random_id" "suffix" {
  byte_length = 4
}

# Bucket de entrada
resource "aws_s3_bucket" "input_bucket" {
  bucket = "image-resizer-input-${random_id.suffix.hex}"
  tags   = local.common_tags
}

# Bucket de salida
resource "aws_s3_bucket" "output_bucket" {
  bucket = "image-resizer-output-${random_id.suffix.hex}"
  tags   = local.common_tags
}

resource "aws_s3_bucket_versioning" "input_versioning" {
  bucket = aws_s3_bucket.input_bucket.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_versioning" "output_versioning" {
  bucket = aws_s3_bucket.output_bucket.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "input_encryption" {
  bucket = aws_s3_bucket.input_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "output_encryption" {
  bucket = aws_s3_bucket.output_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "input_public_access" {
  bucket = aws_s3_bucket.input_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "output_public_access" {
  bucket = aws_s3_bucket.output_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Rol IAM para la Lambda
resource "aws_iam_role" "lambda_role" {
  name               = "image-resizer-lambda-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

# Política de permisos para la Lambda
data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy" "lambda_policy" {
  name   = "image-resizer-lambda-policy"
  role   = aws_iam_role.lambda_role.id
  policy = data.aws_iam_policy_document.lambda_policy.json
}

data "aws_iam_policy_document" "lambda_policy" {
  statement {
    actions = [
      "s3:GetObject",
      "s3:PutObject"
    ]
    resources = [
      "${aws_s3_bucket.input_bucket.arn}/*",
      "${aws_s3_bucket.output_bucket.arn}/*"
    ]
  }

  statement {
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = ["arn:aws:logs:*:*:*"]
  }
}

# Lambda function
resource "aws_lambda_function" "image_resizer" {
  function_name = "image-resizer-lambda"
  role          = aws_iam_role.lambda_role.arn
  handler       = "handler.handler"
  runtime       = "nodejs20.x"
  timeout       = 30
  memory_size   = 512
  architectures = ["x86_64"]

  filename         = "${path.module}/../lambda/dist/lambda.zip"
  source_code_hash = filebase64sha256("${path.module}/../lambda/dist/lambda.zip")

  environment {
    variables = {
      OUTPUT_BUCKET = aws_s3_bucket.output_bucket.bucket
    }
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/image-resizer-lambda"
  retention_in_days = 14
}

# Permiso para que S3 invoque la Lambda
resource "aws_lambda_permission" "allow_s3" {
  statement_id  = "AllowExecutionFromS3"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.image_resizer.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.input_bucket.arn
}

# Trigger: evento S3 -> Lambda
resource "aws_s3_bucket_notification" "input_trigger" {
  bucket = aws_s3_bucket.input_bucket.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.image_resizer.arn
    events              = ["s3:ObjectCreated:*"]
  }

  depends_on = [
    aws_lambda_function.image_resizer,
    aws_lambda_permission.allow_s3,
    aws_s3_bucket_public_access_block.input_public_access
  ]
}

# CORS para subidas directas desde el navegador al bucket de entrada
resource "aws_s3_bucket_cors_configuration" "input_cors" {
  bucket = aws_s3_bucket.input_bucket.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT"]
    allowed_origins = ["*"]
    max_age_seconds = 3000
  }
}

# CORS para descargas con presigned URL desde el navegador al bucket de salida
resource "aws_s3_bucket_cors_configuration" "output_cors" {
  bucket = aws_s3_bucket.output_bucket.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET"]
    allowed_origins = ["*"]
    max_age_seconds = 3000
  }
}