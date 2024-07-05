import setupCheck from "../utils/setupCheck";
import toml from "@iarna/toml";
import "dotenv/config";
import fs from "fs";
import path from "path";

// Importing the Config type from the types file
import { AppConfig } from "@/_developer/types/toml";

// Define the allowed API versions
type APIVersion = "2024-01" | "2023-10" | "2023-07" | "2023-04" | "2024-04";

// Type guard to check if a value is a valid APIVersion
function isValidAPIVersion(version: string): version is APIVersion {
  const allowedVersions: APIVersion[] = ["2024-01", "2023-10", "2023-07", "2023-04", "2024-04"];
  return allowedVersions.includes(version as APIVersion);
}

// Initialize the config object
let config: AppConfig = {} as AppConfig;

try {
  setupCheck(); // Run setup check to ensure all env variables are accessible

  let appUrl = process.env.SHOPIFY_APP_URL || "";
  if (appUrl.endsWith("/")) {
    appUrl = appUrl.slice(0, -1);
  }

  // Globals
  config.name = process.env.APP_NAME || "";
  config.handle = process.env.APP_HANDLE || "";
  config.client_id = process.env.SHOPIFY_API_KEY || "";
  config.application_url = [appUrl];
  config.embedded = true;
  config.extension_directories = ["../extension/extensions/*"];

  // Auth
  config.auth = {
    redirect_urls: [
      `${appUrl}/api/auth/tokens`,
      `${appUrl}/api/auth/callback`,
    ],
  };

  // Scopes
  config.access_scopes = {
    scopes: process.env.SHOPIFY_API_SCOPES || "",
    use_legacy_install_flow: false,
  };

  // Webhook event version to always match the app API version
  const apiVersion = process.env.SHOPIFY_API_VERSION || "";
  if (!isValidAPIVersion(apiVersion)) {
    throw new Error(`Invalid SHOPIFY_API_VERSION: ${apiVersion}`);
  }

  config.webhooks = {
    api_version: apiVersion,
    privacy_compliance: {
      customer_data_request_url: `${appUrl}/api/gdpr/customers_data_request`,
      customer_deletion_url: `${appUrl}/api/gdpr/customers_redact`,
      shop_deletion_url: `${appUrl}/api/gdpr/shop_redact`,
    },
  };

  // App Proxy
  if (
    process.env.APP_PROXY_PREFIX &&
    process.env.APP_PROXY_PREFIX.length > 0 &&
    process.env.APP_PROXY_SUBPATH &&
    process.env.APP_PROXY_SUBPATH.length > 0
  ) {
    config.app_proxy = {
      url: `${appUrl}/api/proxy_route`,
      prefix: process.env.APP_PROXY_PREFIX as 'apps' | 'a' | 'community' | 'tools',
      subpath: process.env.APP_PROXY_SUBPATH,
    };
  }

  // PoS
  if (process.env.POS_EMBEDDED && process.env.POS_EMBEDDED.length > 1) {
    config.pos = {
      embedded: process.env.POS_EMBEDDED === "true",
    };
  }

  // Build
  config.build = {
    include_config_on_deploy: true,
  };

  // Write to TOML
  let str = toml.stringify(config);
  str = "# Avoid writing to toml directly. Use your .env file instead\n\n" + str;

  fs.writeFileSync(path.join(process.cwd(), "shopify.app.toml"), str);

  const extensionsDir = path.join("..", "extension");

  if (fs.existsSync(extensionsDir)) {
    config.extension_directories = ["./extensions/*"];
    let extensionStr = toml.stringify(config);
    extensionStr =
      "# Avoid writing to toml directly. Use your .env file instead\n\n" +
      extensionStr;

    fs.writeFileSync(path.join(extensionsDir, "shopify.app.toml"), extensionStr);
  }

  console.log("TOML files written successfully");
} catch (e) {
  console.error("---> An error occurred while writing TOML files");
  console.error((e as Error).message);
}
