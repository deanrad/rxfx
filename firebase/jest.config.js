module.exports = {
  testEnvironment: 'node', // 'XXX do not checkin!'
  modulePathIgnorePatterns: ['dist/tsc'],
  verbose: true,
  silent: false,
  coveragePathIgnorePatterns: ['example', 'test', 'src/toggleMap.ts'],
  coverageProvider: 'babel',
};
