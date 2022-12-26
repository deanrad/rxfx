module.exports = {
  testEnvironment: 'jsdom',
  modulePathIgnorePatterns: ['dist/tsc'],
  verbose: true,
  silent: false,
  coveragePathIgnorePatterns: ['example', 'test', 'src/toggleMap.ts'],
  coverageProvider: 'babel',
};
