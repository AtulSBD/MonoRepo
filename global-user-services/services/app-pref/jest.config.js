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
    "/src/models",
    "/src/env.ts",
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
    "src/config/",
    "src/index"
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