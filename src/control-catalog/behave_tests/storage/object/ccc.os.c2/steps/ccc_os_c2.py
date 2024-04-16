import logging
import time
import boto3

from google.cloud import storage
from google.cloud import kms_v1
from botocore.exceptions import ClientError
from behave import given, then, when

logging.basicConfig(level=logging.INFO)

BUCKET_OBJ_NAME = "test.txt"
STORAGE_BUCKET_NAME = "malicious-sb-ccc-os-c2"
UNTRUSTED_KEY_NAME = "malicious-sb-untrusted-ccc-os-c2"
UNTRUSTED_KEY_ALIAS = f"alias/{UNTRUSTED_KEY_NAME}"


@given("you own the object storage bucket in AWS")
def aws_verify_bucket_exists(context):
    context.s3_client = boto3.client("s3")
    context.s3_client.get_bucket_policy(Bucket=STORAGE_BUCKET_NAME)


@given("you own the object storage bucket in GCP")
def gcp_verify_bucket_exists(context):
    context.storage_client = storage.Client()
    context.bucket = context.storage_client.bucket(STORAGE_BUCKET_NAME)
    context.bucket.get_iam_policy()


@when(
    "a data plane request with an untrusted KMS key is made to the AWS object storage bucket"
)
def aws_upload_obj_with_untrusted_key(context):
    context.kms_client = boto3.client("kms")
    untrusted_key_arn = context.kms_client.describe_key(KeyId=UNTRUSTED_KEY_ALIAS)[
        "KeyMetadata"
    ]["Arn"]
    object_key = "test_obj"
    object_content = b"Hello, world!"
    try:
        context.s3_client.put_object(
            Bucket=STORAGE_BUCKET_NAME,
            Key=object_key,
            Body=object_content,
            SSEKMSKeyId=untrusted_key_arn,
            ServerSideEncryption="aws:kms",
        )
    except ClientError as err:
        context.s3_publish_error = str(err)


@when(
    "a data plane request with an untrusted KMS key is made to the GCP object storage bucket"
)
def gcp_upload_obj_with_untrusted_key(context):
    # This control needs to be reviewed in more detail - we
    # can upload to the bucket with an untrusted key.
    client = kms_v1.KeyManagementServiceClient()
    parent = "projects/common-cloud-controls-testing/locations/us-central1"
    key_rings = client.list_key_rings(request={"parent": parent})

    kms_key_id = None
    for key_ring in key_rings:
        kms_keys = kms_v1.ListCryptoKeysRequest(mapping={"parent": key_ring.name})
        for kms_key in client.list_crypto_keys(kms_keys):
            if (
                UNTRUSTED_KEY_NAME in kms_key.name
                and kms_key.primary.destroy_time is None
            ):
                kms_key_id = kms_key.name
                break

        if kms_key_id is not None:
            break

    bucket = storage.Bucket(context.storage_client, STORAGE_BUCKET_NAME)
    bucket.blob(BUCKET_OBJ_NAME, kms_key_name=kms_key_id).upload_from_string(
        "Hello, World"
    )
    time.sleep(10)  # Sleep for 10 seconds


@then("the AWS request should be denied")
def validate_request_denied(context):
    print(context.s3_publish_error)
    if "AccessDenied" in context.s3_publish_error:
        assert True
    else:
        assert False


@then("the GCP storage object should have been deleted")
def validate_request_denied(context):
    bucket = storage.Bucket(context.storage_client, STORAGE_BUCKET_NAME)
    blob = bucket.blob(BUCKET_OBJ_NAME)
    assert not blob.exists()
