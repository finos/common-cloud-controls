module "aws_storage_object_ccc_os_c1" {
  source      = "./object/ccc.os.c1/aws"
  bucket_name = var.bucket_name
}

module "gcp_storage_object_ccc_os_c1" {
  source      = "./object/ccc.os.c1/gcp"
  bucket_name = var.bucket_name
}

module "aws_storage_object_ccc_os_c3" {
  source      = "./object/ccc.os.c3/aws"
  bucket_name = var.bucket_name
}