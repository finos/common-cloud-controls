import type { ServiceId } from "../types";
import type { ProviderRules } from "./common";
import * as objectStorage from "./object-storage";
import * as secrets from "./secrets";
import * as vpc from "./vpc";
import * as logging from "./logging";
import * as serverless from "./serverless-computing";
import * as vms from "./virtual-machines";

type CloudRules = { aws: unknown; azure: unknown; gcp: unknown };
const all = (m: CloudRules) => [m.aws, m.azure, m.gcp] as ProviderRules[];

/**
 * Rule sets for every service, one per cloud. A template is checked by each of its
 * service's rule sets whose resources it declares.
 */
export const SERVICE_RULES: Record<ServiceId, ProviderRules[]> = {
  "object-storage": all(objectStorage),
  secrets: all(secrets),
  vpc: all(vpc),
  logging: all(logging),
  "serverless-computing": all(serverless),
  "virtual-machines": all(vms),
};
