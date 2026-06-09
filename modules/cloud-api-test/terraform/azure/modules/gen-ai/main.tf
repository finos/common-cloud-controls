locals {
  endpoint_name        = "finos-ccc-integration-genai-endpoint"
  guardrail_name       = "finos-ccc-integration-genai-guardrail"
  kb_name              = "finos-ccc-integration-genai-kb"
  approved_source_id   = "finos-ccc-integration-genai-approved-bucket"
  unvetted_source_id   = "finos-ccc-integration-genai-unvetted-bucket"
  plugin_tool_name     = "finos-ccc-integration-genai-plugin"
  acceptable_sources   = ["https://${local.approved_source_id}.blob.core.windows.net/"]
  openai_account_name  = "finoscccintgenai${random_string.suffix.result}"
  deployment_model     = "gpt-4o-mini"
}

resource "random_string" "suffix" {
  length  = 4
  special = false
  upper   = false
}

resource "azurerm_cognitive_account" "openai" {
  name                          = local.openai_account_name
  location                      = var.location
  resource_group_name           = var.resource_group
  kind                          = "OpenAI"
  sku_name                      = "S0"
  custom_subdomain_name         = local.openai_account_name
  public_network_access_enabled = true

  tags = merge(var.common_tags, {
    CFIControlSet = "CCC.GenAI"
    Name          = local.endpoint_name
  })
}

resource "azurerm_cognitive_deployment" "main" {
  name                 = local.endpoint_name
  cognitive_account_id = azurerm_cognitive_account.openai.id

  model {
    format  = "OpenAI"
    name    = local.deployment_model
    version = var.openai_model_version
  }

  sku {
    name     = "Standard"
    capacity = 1
  }
}

resource "azurerm_role_assignment" "openai_user" {
  count                = var.integration_runner_object_id != "" ? 1 : 0
  scope                = azurerm_cognitive_account.openai.id
  role_definition_name = "Cognitive Services OpenAI User"
  principal_id         = var.integration_runner_object_id
}
