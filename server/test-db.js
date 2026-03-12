import { getPool } from "./db.js";

try {
  const pool = await getPool();
  const r = await pool.request().query("SELECT 1 AS ok");
  console.log("Conexión OK:", r.recordset);
  process.exit(0);
} catch (e) {
  console.error("Error conexión:", e.message);
  process.exit(1);
}
