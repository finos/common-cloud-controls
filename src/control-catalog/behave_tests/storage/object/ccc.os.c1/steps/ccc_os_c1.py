import logging
import boto3
import time

from botocore.exceptions import ClientError
from google.cloud import storage
from behave import given, then, when

logging.basicConfig(level=logging.INFO)

STORAGE_BUCKET_NAME = "malicious-sb-ccc-os-c1"


@given("you own the object storage bucket in AWS")
def verify_aws_bucket_exists(context):
    context.s3_client = boto3.client("s3")
    context.insecure_s3_client = boto3.client(
        "s3",
        region_name="eu-west-3",
        use_ssl=False,
    )
    context.s3_client.get_bucket_policy(Bucket=STORAGE_BUCKET_NAME)


@given("you own the object storage bucket in GCP")
def verify_gcp_bucket_exists(context):
    context.storage_client = storage.Client()
    context.bucket = context.storage_client.bucket(STORAGE_BUCKET_NAME)
    context.bucket.get_iam_policy()


@when("an unencrypted HTTP request is made to the AWS bucket")
def upload_unencrypted_obj_to_aws(context):
    object_key = "test_obj"
    object_content = b"Hello, world!"

    try:
        context.insecure_s3_client.put_object(
            Bucket=STORAGE_BUCKET_NAME, Key=object_key, Body=object_content
        )
    except ClientError as err:
        context.s3_publish_error = str(err)


@when("an encrypted HTTPS request is made to the GCP bucket")
def upload_encrypted_obj_to_gcp(context):
    context.bucket.blob(f"test-obj-{round(time.time())}.txt").upload_from_string(
        "Hello, World"
    )


@then("the request should be denied")
def validate_request_denied(context):
    if "AccessDenied" in context.s3_publish_error:
        assert True
    else:
        assert False


@then("the request should be encrypted")
def validate_request_encrypted(context):
    if "https://" in context.storage_client.api_endpoint:
        assert True
    else:
        assert False
