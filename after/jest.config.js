module.exports = {
  testEnvironment: 'node',
  modulePathIgnorePatterns: ['dist/tsc'],
  moduleNameMapper: {
    '^@rxfx/(.+)$': '<rootDir>/../$1/src',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\.[tj]s$': 'babel-jest',
  },
  watchman: false,
  verbose: true,
  silent: false,
  coveragePathIgnorePatterns: ['example', 'test', 'src/toggleMap.ts'],
  coverageProvider: 'babel',
};
