import { config } from "dotenv";
import knex from "knex";
import knexConfig from "../../../knexfile.js";

config();

export const db = knex(
  knexConfig[process.env.NODE_ENV] || knexConfig.development,
);
