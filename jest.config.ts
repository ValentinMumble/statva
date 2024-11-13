export default {
  preset: 'ts-jest',
  // testEnvironment: 'jest-environment-jsdom',
  transform: {
    '^.+\\.ts(x)?$': 'ts-jest',
  },
  moduleNameMapper: {
    // '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/test/__ mocks __/fileMock.js',
  },
};
