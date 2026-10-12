export default {
  preset: 'ts-jest',
  transform: {
    '^.+\\.ts(x)?$': 'ts-jest',
  },
  // The server code imports its own files with a .js extension, as Node needs.
  moduleNameMapper: {'^(\\.{1,2}/.*)\\.js$': '$1'},
  collectCoverage: true,
  coverageDirectory: 'test/coverage',
};
