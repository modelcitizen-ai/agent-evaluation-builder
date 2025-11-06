// Human Evaluation Builder – One-click backend deploy (App Service + PostgreSQL + Key Vault + App Insights)
// Minimal, UI-friendly parameters with safe defaults. Runs the app from a versioned zip (WEBSITE_RUN_FROM_PACKAGE).

@description('Name of the Web App (must be globally unique).')
param appName string

@description('Azure region for all resources (defaults to the resource group region).')
param location string = resourceGroup().location

@description('URI to the packaged backend zip (versioned release asset or SAS). Prefilled for one-click.')
param packageUri string = 'https://humanelevaldeploy.blob.core.windows.net/deploy/deployment-backend-built.zip?se=2026-08-09T14%3A16%3A02Z&sp=r&sv=2022-11-02&sr=b&sig=F3lXlJUFZwOGiuK2GbHVCaxJP0bq66%2F373sV4HaCpUM%3D'

@description('App Service Plan SKU. Examples: B1, B2, S1, P1v3. Default: B1 (Basic)')
param appServiceSku string = 'B1'

@description('PostgreSQL server admin username. Example: pgadmin')
param postgresAdministratorLogin string

@secure()
@description('PostgreSQL server admin password (stored only in Key Vault).')
param postgresAdministratorLoginPassword string

@description('PostgreSQL Flexible Server SKU name. Examples: Standard_B1ms, Standard_D2s_v5. Default: Standard_B1ms')
param postgresSkuName string = 'Standard_B2s'

@description('PostgreSQL tier. Allowed: Burstable, GeneralPurpose, MemoryOptimized. Default: Burstable')
@allowed([
  'Burstable'
  'GeneralPurpose'
  'MemoryOptimized'
])
param postgresSkuTier string = 'Burstable'

@description('Database name to create on the server. Default: evaluationdb')
param databaseName string = 'evaluationdb'

@description('Max storage size for PostgreSQL (GB). Default: 64')
param postgresStorageSizeGB int = 64

// Generate safe resource names (Key Vault names must be 3-24 chars, alphanumeric + hyphens, no consecutive hyphens)
// Trim spaces and sanitize the app name
var cleanName = trim(replace(replace(replace(appName, ' ', ''), '--', '-'), '_', ''))
var safeName = take(cleanName, 50) // Limit length to prevent issues
var kvName = length(safeName) > 20 ? '${take(safeName, 20)}-kv' : '${safeName}-kv'

// Resource: App Service Plan (Linux)
resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: '${safeName}-plan'
  location: location
  kind: 'linux'
  sku: {
    name: appServiceSku
    capacity: 1
  }
  properties: {
    reserved: true // Linux
  }
  tags: {
    'app': safeName
  }
}

// Resource: Log Analytics Workspace (explicit to keep in same RG)
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: take('${safeName}-logs', 63) // Ensure max 63 chars
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
  tags: {
    'app': safeName
  }
}

// Resource: Application Insights (linked to our Log Analytics workspace)
resource ai 'microsoft.insights/components@2020-02-02' = {
  name: '${safeName}-ai'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
  tags: {
    'app': safeName
  }
}

// Resource: Key Vault (RBAC model)
resource kv 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: kvName
  location: location
  properties: {
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    sku: {
      family: 'A'
      name: 'standard'
    }
    softDeleteRetentionInDays: 7
  }
  tags: {
    'app': safeName
  }
}

// Resource: PostgreSQL Flexible Server (public access, SSL required)
resource pg 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: '${safeName}-pg'
  location: location
  sku: {
    name: postgresSkuName
    tier: postgresSkuTier
  }
  properties: {
    version: '16'
    administratorLogin: postgresAdministratorLogin
    administratorLoginPassword: postgresAdministratorLoginPassword
    storage: {
      storageSizeGB: postgresStorageSizeGB
    }
    backup: {
      backupRetentionDays: 7
    }
    authConfig: {
      // MVP: password auth enabled; AAD can be enabled later by the customer
      activeDirectoryAuth: 'Disabled'
      passwordAuth: 'Enabled'
    }
    network: {
      publicNetworkAccess: 'Enabled'
    }
  }
  tags: {
    'app': safeName
  }
}

// Database on the server
resource db 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  name: '${pg.name}/${databaseName}'
}

// Firewall rule to allow Azure services
resource pgFirewallAzure 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = {
  name: '${pg.name}/AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// Disable SSL requirement for easier connectivity
resource pgConfigSSL 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2024-08-01' = {
  name: '${pg.name}/require_secure_transport'
  properties: {
    value: 'off'
    source: 'user-override'
  }
}

// Web App (Linux) with System-assigned Managed Identity
var kvSecretUri = 'https://${kv.name}.vault.azure.net/secrets/DATABASE-URL'

resource site 'Microsoft.Web/sites@2023-12-01' = {
  name: safeName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  kind: 'app,linux'
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|22-lts'
      alwaysOn: true
      appSettings: [
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: packageUri
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~22'
        }
        {
          name: 'NODE_ENV'
          value: 'production'
        }
        {
          name: 'PORT'
          value: '8080'
        }
        {
          name: 'USE_POSTGRESQL'
          value: 'true'
        }
        {
          name: 'DATABASE_URL'
          value: '@Microsoft.KeyVault(SecretUri=${kvSecretUri})'
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: ai.properties.ConnectionString
        }
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: ai.properties.InstrumentationKey
        }
        {
          name: 'ApplicationInsightsAgent_EXTENSION_VERSION'
          value: '~3'
        }
        {
          name: 'NEXT_TELEMETRY_DISABLED'
          value: '1'
        }
      ]
    }
  }
  tags: {
    'app': appName
  }
}

// Grant Key Vault Secrets User to the Web App managed identity
resource kvAccess 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(kv.id, '4633458b-17de-408a-b874-0445c86b69e6', appName)
  scope: kv
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6') // Key Vault Secrets User
    principalId: site.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// Compose and store DATABASE_URL in Key Vault (depends on server FQDN and DB creation)
// URL-encode the password to handle special characters safely
var encodedPassword = replace(replace(replace(replace(replace(replace(replace(replace(
  postgresAdministratorLoginPassword, 
  '@', '%40'), 
  ':', '%3A'), 
  '/', '%2F'), 
  '?', '%3F'),
  '#', '%23'),
  '&', '%26'),
  '+', '%2B'),
  ' ', '%20')
var dbUrl = 'postgresql://${postgresAdministratorLogin}:${encodedPassword}@${pg.properties.fullyQualifiedDomainName}:5432/${databaseName}?sslmode=disable'

resource kvSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: '${kv.name}/DATABASE-URL'
  properties: {
    value: dbUrl
    contentType: 'application/x-postgresql-url'
  }
  dependsOn: [
    kvAccess  // Ensure role assignment is complete before creating secret
    pg
    db
  ]
}

output webAppUrl string = 'https://${site.properties.defaultHostName}'
output postgresFqdn string = pg.properties.fullyQualifiedDomainName
output keyVaultName string = kv.name
