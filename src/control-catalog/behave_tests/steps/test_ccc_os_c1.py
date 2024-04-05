import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

from behave import given, then, when

STORAGE_BUCKET_NAME = "malicious-sb-ccc-os-c1"

@given("you own the object storage bucket")
def given(context):
    context.s3_client = boto3.client("s3")
    context.insecure_s3_client = boto3.client(
        "s3",
        region_name="eu-west-3",
        use_ssl=False,
    )
    context.s3_client.get_bucket_policy(Bucket=STORAGE_BUCKET_NAME)


@when("an unencrypted HTTP request is made to the bucket")
def when(context):
    object_key = "test_obj"

    # Specify the content of the object
    object_content = b"Hello, world!"

    # Upload the object using HTTP
    try:
        context.insecure_s3_client.put_object(
            Bucket=STORAGE_BUCKET_NAME, Key=object_key, Body=object_content
        )
    except ClientError as err:
        context.s3_publish_error = str(err)

@then("the request should be denied")
def then(context):
    if "AccessDenied" in context.s3_publish_error:
        assert True
    else:
        assert False