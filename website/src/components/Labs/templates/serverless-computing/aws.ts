import type { ExampleSource } from "../index";

/** AWS (AWS Lambda) variants of each example. */
export const EXAMPLES: ExampleSource[] = [
  {
    example: "basic",
    description: "A Lambda function published through a function URL with no authentication, the quickest way to get an HTTP endpoint. A good place to start fixing things.",
    code: `provider "aws" {
  region = "eu-west-2"
}

resource "aws_iam_role" "orders" {
  name = "orders-api-lambda"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "logs" {
  role       = aws_iam_role.orders.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "orders" {
  function_name    = "orders-api"
  role             = aws_iam_role.orders.arn
  runtime          = "python3.12"
  handler          = "app.handler"
  filename         = "build/orders-api.zip"
  source_code_hash = filebase64sha256("build/orders-api.zip")

  environment {
    variables = {
      TABLE_NAME = "orders"
    }
  }
}

# Anyone on the internet can call this URL.
resource "aws_lambda_function_url" "orders" {
  function_name      = aws_lambda_function.orders.function_name
  authorization_type = "NONE"
}

resource "aws_lambda_permission" "public_url" {
  statement_id           = "AllowPublicFunctionUrl"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.orders.function_name
  principal              = "*"
  function_url_auth_type = "NONE"
}
`,
  },
  {
    example: "intermediate",
    description:
      "The function URL now requires IAM (SigV4) auth, concurrency is capped and CloudTrail records management events. The URL is still internet-facing, invocations aren't logged and the environment uses the AWS-managed key.",
    code: `provider "aws" {
  region = "eu-west-2"
}

variable "audit_log_bucket" {
  description = "Existing S3 bucket that receives CloudTrail logs."
  type        = string
}

resource "aws_iam_role" "orders" {
  name = "orders-api-lambda"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "logs" {
  role       = aws_iam_role.orders.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "orders" {
  function_name                  = "orders-api"
  role                           = aws_iam_role.orders.arn
  runtime                        = "python3.12"
  handler                        = "app.handler"
  filename                       = "build/orders-api.zip"
  source_code_hash               = filebase64sha256("build/orders-api.zip")
  reserved_concurrent_executions = 50

  environment {
    variables = {
      TABLE_NAME = "orders"
    }
  }
}

# Callers must sign requests with AWS credentials, but the URL is public.
resource "aws_lambda_function_url" "orders" {
  function_name      = aws_lambda_function.orders.function_name
  authorization_type = "AWS_IAM"
}

resource "aws_cloudtrail" "main" {
  name                       = "account-trail"
  s3_bucket_name             = var.audit_log_bucket
  is_multi_region_trail      = true
  enable_log_file_validation = true
}
`,
  },
  {
    example: "hardened",
    description:
      "A private function with no URL or public grants, invoked only through the IAM-authenticated Lambda API. Concurrency is capped, the environment uses a customer-managed key and CloudTrail records every invocation.",
    code: `provider "aws" {
  region = "eu-west-2" # CCC.Core.CN06: trusted region
}

variable "audit_log_bucket" {
  description = "Existing S3 bucket that receives CloudTrail logs."
  type        = string
}

resource "aws_kms_key" "orders" {
  description         = "orders-api environment encryption"
  enable_key_rotation = true
}

resource "aws_iam_role" "orders" {
  name = "orders-api-lambda"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "logs" {
  role       = aws_iam_role.orders.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# CCC.SvlsComp.CN01 / CCC.Core.CN05: no function URL, API or "*" permission,
# so the only way in is the IAM-authenticated Lambda Invoke API.
resource "aws_lambda_function" "orders" {
  function_name    = "orders-api"
  role             = aws_iam_role.orders.arn
  runtime          = "python3.12"
  handler          = "app.handler"
  filename         = "build/orders-api.zip"
  source_code_hash = filebase64sha256("build/orders-api.zip")

  reserved_concurrent_executions = 20                      # CCC.SvlsComp.CN02: invocation cap
  kms_key_arn                    = aws_kms_key.orders.arn  # CCC.Core.CN02: customer-managed key

  environment {
    variables = {
      TABLE_NAME = "orders"
    }
  }
}

# CCC.Core.CN09: logs live in CloudWatch Logs, outside the function.
resource "aws_cloudwatch_log_group" "orders" {
  name              = "/aws/lambda/orders-api"
  retention_in_days = 365
}

# CCC.Core.CN04: management events plus Lambda Invoke data events.
resource "aws_cloudtrail" "main" {
  name                       = "account-trail"
  s3_bucket_name             = var.audit_log_bucket
  is_multi_region_trail      = true
  enable_log_file_validation = true

  event_selector {
    read_write_type           = "All"
    include_management_events = true

    data_resource {
      type   = "AWS::Lambda::Function"
      values = [aws_lambda_function.orders.arn]
    }
  }
}
`,
  },
];
