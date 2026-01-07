const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  // Transform ES modules from unified/remark/rehype ecosystem
  // The pattern uses negative lookahead to exclude these packages from being ignored
  // This tells Jest to transform these packages instead of ignoring them
  transformIgnorePatterns: [
    'node_modules/(?!(remark-gfm|unified|remark-parse|remark-rehype|rehype-highlight|rehype-raw|rehype-stringify|rehype-slug|unist-util-visit)/)',
  ],
  // Ensure Next.js transformer handles .js files from these packages
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)



