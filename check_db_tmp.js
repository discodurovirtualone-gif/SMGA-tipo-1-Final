const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function main() {
  const p = await pool.query(`SELECT id_vaca, ejercicio, lc305_wood FROM registros_productivos ORDER BY id_vaca, ejercicio`);
  console.log('productivos:');
  p.rows.forEach(r => console.log(`  vaca=${r.id_vaca} ej=${r.ejercicio} lc305=${r.lc305_wood}`));
  const b = await pool.query(`SELECT id_vaca, ejercicio, potencial_vaca FROM registros_basicos ORDER BY id_vaca, ejercicio`);
  console.log('basicos:');
  b.rows.forEach(r => console.log(`  vaca=${r.id_vaca} ej=${r.ejercicio} potencial=${r.potencial_vaca}`));
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
