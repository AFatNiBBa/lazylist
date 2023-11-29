
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    "\\.tsx?$": [
      "ts-jest",
      {
        diagnostics: false,
        tsconfig: {
          target: "ES2022",
          esModuleInterop: true
        }
      }
    ]
  }
};