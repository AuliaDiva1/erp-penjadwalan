import { config } from "dotenv";

config();

const knexConfig = {
  development: {
    client: String(process.env.DB_CLIENT) || "mysql",
    connection: {
      host: String(process.env.DB_HOST) || "localhost",
      user: String(process.env.DB_USERNAME) || "root",
      password: String(process.env.DB_PASSWORD) || "",
      database: String(process.env.DB_NAME) || "",
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
    },
    migrations: {
      directory: "./src/migrations",
      extension: "js",
    },
  },
};

export default knexConfig;
