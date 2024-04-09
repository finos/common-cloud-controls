import logging
import boto3
import time

from botocore.exceptions import ClientError
from google.cloud import storage
from behave import given, then, when

logging.basicConfig(level=logging.DEBUG)

STORAGE_BUCKET_NAME = "malicious-sb-ccc-os-c3"


@given("you own the object storage bucket in AWS")
def verify_aws_bucket_exists(context):
    context.s3_client = boto3.client("s3")
    context.s3_client.get_bucket_acl(Bucket=STORAGE_BUCKET_NAME)


@when(
    "the access controls on the bucket are updated to grant public access to the AWS bucket"
)
def update_acls_on_bucket_to_allow_public_access(context):
    try:
        context.s3_client.put_bucket_acl(
            ACL="public-read-write", Bucket=STORAGE_BUCKET_NAME
        )
    except ClientError as err:
        context.s3_publish_error = str(err)


@then("the request should be denied")
def validate_request_denied(context):
    if "AccessDenied" in context.s3_publish_error:
        assert True
    else:
        assert False
