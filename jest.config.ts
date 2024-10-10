export default {
  preset: 'ts-jest',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleDirectories: ['node_modules', 'src'],
  moduleNameMapper: {
    '^config/(.*)$': '<rootDir>/config/$1',
    '^decorators/(.*)$': '<rootDir>/decorators/$1',
    '^entities/(.*)$': '<rootDir>/entities/$1',
    '^helpers/(.*)$': '<rootDir>/helpers/$1',
    '^interfaces/(.*)$': '<rootDir>/interfaces/$1',
    '^utils/(.*)$': '<rootDir>/utils/$1',
  },
}
