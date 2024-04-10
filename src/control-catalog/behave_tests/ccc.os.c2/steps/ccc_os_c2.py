import logging
import boto3

from botocore.exceptions import ClientError
from behave import given, then, when

logging.basicConfig(level=logging.DEBUG)

STORAGE_BUCKET_NAME = "malicious-sb-ccc-os-c2"


@given("you own the object storage bucket in AWS")
def verify_aws_bucket_exists(context):
    context.s3_client = boto3.client("s3")
    context.s3_client.get_bucket_policy(Bucket=STORAGE_BUCKET_NAME)


@when("a data plane request with an untrusted KMS key is made to the object storage bucket")
def upload_obj_with_untrusted_key(context):
    object_key = "test_obj"
    object_content = b"Hello, world!"
    untrusted_key_id = "arn:aws:kms:us-west-2:123456789012:key/12345678-1234-1234-1234-123456789012"
    try:
        context.s3_client.put_object(
            Bucket=STORAGE_BUCKET_NAME, Key=object_key, Body=object_content, SSEKMSKeyId=untrusted_key_id
        )
    except ClientError as err:
        context.s3_publish_error = str(err)


@then("the request should be denied")
def validate_request_denied(context):
    if "AccessDenied" in context.s3_publish_error:
        assert True
    else:
        assert False