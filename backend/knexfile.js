import { config } from "dotenv";

config();

const sslConfig =
  process.env.DB_SSL === "true"
    ? { rejectUnauthorized: true, minVersion: "TLSv1.2" }
    : false;

const knexConfig = {
  development: {
    client: String(process.env.DB_CLIENT) || "mysql",
    connection: {
      host: String(process.env.DB_HOST) || "localhost",
      user: String(process.env.DB_USERNAME) || "root",
      password: String(process.env.DB_PASSWORD) || "",
      database: String(process.env.DB_NAME) || "",
      ssl: sslConfig,
      timezone: "+07:00",
    },
    migrations: {
      directory: "./src/migrations",
      extension: "js",
      loadExtensions: [".js"],
    },
  },
  production: {
    client: String(process.env.DB_CLIENT) || "mysql",
    connection: {
      host: String(process.env.DB_HOST) || "localhost",
      user: String(process.env.DB_USERNAME) || "root",
      password: String(process.env.DB_PASSWORD) || "",
      database: String(process.env.DB_NAME) || "",
      ssl: sslConfig,
      timezone: "+07:00",
    },
    migrations: {
      directory: "./src/migrations",
      extension: "js",
    },
  },
};

export default knexConfig;