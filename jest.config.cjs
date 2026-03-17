module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.js"],
  clearMocks: true,
  moduleDirectories: ["node_modules", "<rootDir>/lambda/node_modules"],
};
