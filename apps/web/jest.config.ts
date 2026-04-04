import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@tawala/core$": "<rootDir>/../../packages/core/src/index.ts",
    "^@tawala/core/(.*)$": "<rootDir>/../../packages/core/src/$1",
    "^@/(.*)$": "<rootDir>/$1",
  },
};

export default createJestConfig(config);
