// jest.config.js
module.exports = {
  preset: "ts-jest", // Use ts-jest preset
  testEnvironment: "node", // Specify the test environment
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest", // Transform TypeScript files
  },
  moduleFileExtensions: ["js", "json", "jsx", "ts", "tsx", "node"], // File extensions to process
  testMatch: ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"], // Where to find tests
  collectCoverage: true, // Collect coverage information
  collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/**/*.d.ts"], // Collect coverage from .ts files except declaration files
  coverageDirectory: "coverage", // Output directory for coverage reports
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.json", // Path to your tsconfig.json
    },
  },
};
