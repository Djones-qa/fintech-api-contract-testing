import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  testMatch: [
    "<rootDir>/src/**/*.test.ts",
    "<rootDir>/src/**/*.spec.ts"
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1"
  },
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/**/index.ts"
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  testTimeout: 30000,
  verbose: true,
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.json"
    }
  }
};

export default config;
