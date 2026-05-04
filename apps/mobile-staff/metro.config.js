const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
// disableHierarchicalLookup disabled — causes module resolution failure in dev client with monorepo root
// config.resolver.disableHierarchicalLookup = true;

// Normalize dev-client bundle URL: older builds send /expo/ instead of /.expo/
// Also fix Windows backslashes in rewritten paths so Metro URL parsing works correctly
const originalRewrite = config.server?.rewriteRequestUrl;
config.server = {
  ...config.server,
  rewriteRequestUrl(url) {
    const normalized = url.replace(
      /\/expo\/\.virtual-metro-entry\.bundle/,
      "/.expo/.virtual-metro-entry.bundle"
    );
    const result = originalRewrite ? originalRewrite(normalized) : normalized;
    // On Windows, resolveEntryPoint returns backslash paths — convert to forward slashes for URLs
    return typeof result === "string" ? result.replace(/\\/g, "/") : result;
  },
};

module.exports = config;
