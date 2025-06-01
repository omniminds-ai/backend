export default {
  uri: "mongodb://localhost:27017/dev-omniminds",
  collection: "migrations",
  migrationsPath: "./migrations",
  templatePath: "./migrations/template.ts",
  autosync: true,
};