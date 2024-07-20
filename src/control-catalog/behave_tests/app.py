import sys
import subprocess
import logging

from os import environ
from glob import glob

if environ.get("AWS_DEFAULT_REGION") is None:
    environ["AWS_DEFAULT_REGION"] = "eu-west-3"  # Set to France


class BehaveTester:

    def __init__(self) -> None:
        logging.basicConfig(level=logging.INFO)
        self.logging = logging.getLogger(__name__)

    def run_behave(self, service_name):
        abs_behave_file_paths = glob("./**/*.feature", recursive=True)

        for abs_behave_file_path in abs_behave_file_paths:
            behave_test_dir = "/".join(abs_behave_file_path.split("/")[:-2])
            if service_name in behave_test_dir:
                print(f"Running behave for {service_name}")
                try:
                    subprocess.run(["behave", behave_test_dir], check=True)
                except subprocess.CalledProcessError as err:
                    self.logging.error(f"Behave tested failed: {err}")
                    sys.exit(1)
            else:
                self.logging.info(f"Behave for service {service_name} not found!")
                sys.exit(1)

        self.logging.info(f"Behave tested passed for the {service_name} service!")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 app.py <service_name>")
        sys.exit(1)

    tester = BehaveTester()
    tester.run_behave(sys.argv[1])
