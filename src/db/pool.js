import mysql from "mysql2/promise.js";

export const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "root",
  database: process.env.DB_NAME || "Vindeo",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});