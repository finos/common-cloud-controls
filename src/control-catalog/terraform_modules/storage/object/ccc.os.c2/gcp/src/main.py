import logging
import functions_framework
from google.cloud import storage

logging.basicConfig(level=logging.INFO)

@functions_framework.cloud_event
def delete_object(event):
    logging.info("Function triggered: %s", event.data)

    bucket_name = event.data['bucket']
    object_name = event.data['name']
    kms_key_name = event.data['kmsKeyName']

    # Initialize the client
    client = storage.Client()

    # Get the bucket
    bucket = client.get_bucket(bucket_name)

    # Get the object
    blob = bucket.blob(object_name)

    # Check if the object is not encrypted with the default CMEK
    # or if the object is not encrypted with a CMEK
    if bucket.default_kms_key_name not in kms_key_name:
        blob.delete()
        logging.info("Object %s deleted successfully.", object_name)
        return f"Object {object_name} deleted successfully.", 200
    else:
        logging.info("Object %s is already encrypted with the default CMEK.", object_name)
        return f"Object {object_name} is already encrypted with the default CMEK.", 200
    