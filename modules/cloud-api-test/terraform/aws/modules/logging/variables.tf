variable "bucket_arn" {
  type = string
}

variable "lambda_function_arn" {
  type = string
}

variable "common_tags" {
  type = map(string)
}
