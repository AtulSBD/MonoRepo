/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  preset: 'ts-jest',
  testEnvironment: "node",
  transform: {
    "^.+.tsx?$": ["ts-jest", {}],
  },
  testPathIgnorePatterns: [
    "/node_module/",
    "/dist/",
    "/coverage/",
    "/src/services",
    "/src/models",
    "/src/env.ts",
    "/src/app.ts"
  ],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/services",
    "!src/index.ts"
  ],
  coveragePathIgnorePatterns: [
    "/node_module/",
    "/dist/",
    "/coverage/",
    "/src/models/",
    "src/env",
    "src/db/",
    "src/types/",
    "src/index",
    "src/app",
    "src/user-pref/user-pref-model",
    "src/user-pref/user-pref-schema",
    "src/user-activity/user-activity-model",
    "src/user-activity/user-activity-schema",
    "src/config/config-model",
    "src/config/config-schema",
    "src/combine"
  ],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['html', 'json', 'lcov', 'text', 'clover', 'cobertura'],
  coverageThreshold: {
    "global": {
      "functions": 90,
      "lines": 90,
      "statements": 90
    }
  },
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: './coverage', outputName: 'jest-junit.xml' }],
  ],


};