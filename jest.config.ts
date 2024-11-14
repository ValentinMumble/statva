export default {
  preset: 'ts-jest',
  transform: {
    '^.+\\.ts(x)?$': 'ts-jest',
  },
  collectCoverage: true,
  coverageDirectory: 'test/coverage',
};
