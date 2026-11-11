import { aws } from "./objectStorage.aws";
import { azure } from "./objectStorage.azure";
import { gcp } from "./objectStorage.gcp";
import type { ProviderRules } from "./common";

/** Rule sets for every supported cloud. A template is checked by each provider whose resources it declares. */
export const PROVIDERS = [aws, azure, gcp] as unknown as ProviderRules[];
