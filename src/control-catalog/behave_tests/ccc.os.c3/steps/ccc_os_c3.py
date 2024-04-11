import logging
import boto3

from botocore.exceptions import ClientError
from google.api_core.exceptions import PreconditionFailed
from google.cloud import storage
from behave import given, then, when

logging.basicConfig(level=logging.DEBUG)

STORAGE_BUCKET_NAME = "malicious-sb-ccc-os-c3"


@given("you own the object storage bucket in AWS")
def aws_verify_bucket_exists(context):
    context.s3_client = boto3.client("s3")
    context.s3_client.get_bucket_acl(Bucket=STORAGE_BUCKET_NAME)


@given("you own the object storage bucket in GCP")
def gcp_verify_bucket_exists(context):
    context.storage_client = storage.Client()
    context.bucket = context.storage_client.bucket(STORAGE_BUCKET_NAME)
    context.bucket.get_iam_policy()


@when(
    "the access controls on the bucket are updated to grant public access to the AWS bucket"
)
def aws_update_acls_on_bucket_to_allow_public_access(context):
    try:
        context.s3_client.put_bucket_acl(
            ACL="public-read-write", Bucket=STORAGE_BUCKET_NAME
        )
    except ClientError as err:
        context.s3_publish_error = str(err)


@when(
    "the access controls on the bucket are updated to grant public access to the GCP bucket"
)
def gcp_update_acls_on_bucket_to_allow_public_access(context):
    acl = storage.Bucket(context.storage_client, STORAGE_BUCKET_NAME).acl

    # Attempting to modify ACL to allow all users public access
    acl.all().grant_read()
    acl.all().grant_write()

    try:
        acl.save()
    except PreconditionFailed as err:
        context.gcp_publish_error = str(err)


@then("the request should be denied")
def validate_request_denied(context):
    if (
        "AccessDenied" in context.s3_publish_error
        and "412 PATCH" in context.gcp_publish_error
    ):
        assert True
    else:
        assert False
