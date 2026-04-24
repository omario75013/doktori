// Metro config for Expo + monorepo (pnpm workspace)
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch the entire monorepo so Metro picks up changes in packages/*
config.watchFolders = [workspaceRoot];

// Resolve node_modules from both project and workspace root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Prevent resolving hoisted dependencies twice (pnpm strict linking)
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
