data "archive_file" "lambda_zip" {
  type                    = "zip"
  output_path             = "${path.module}/lambda-function.zip"
  source_content          = <<-PY
    import json
    def handler(event, context):
        return {"statusCode": 200, "body": json.dumps({"ok": True, "event": event})}
  PY
  source_content_filename = "index.py"
}

resource "aws_iam_role" "lambda_exec" {
  name = "cfi-${var.deployment_suffix}-lambda-exec"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
  tags = var.common_tags
}

resource "aws_iam_role_policy_attachment" "basic_exec" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "good" {
  function_name    = "cfi-${var.deployment_suffix}-fn-good"
  role             = aws_iam_role.lambda_exec.arn
  runtime          = "python3.12"
  handler          = "index.handler"
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  timeout          = 3
  memory_size      = 128
  reserved_concurrent_executions = 10
  tags = merge(var.common_tags, {
    CFIControlSet = "CCC.SvlsComp"
  })
}

resource "aws_lambda_function" "bad" {
  function_name    = "cfi-${var.deployment_suffix}-fn-bad"
  role             = aws_iam_role.lambda_exec.arn
  runtime          = "python3.12"
  handler          = "index.handler"
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  timeout          = 3
  memory_size      = 128
  reserved_concurrent_executions = 10
  tags = merge(var.common_tags, {
    CFIControlSet = "CCC.SvlsComp"
  })
}

resource "aws_lambda_function_url" "bad" {
  function_name      = aws_lambda_function.bad.function_name
  authorization_type = "NONE"
}
