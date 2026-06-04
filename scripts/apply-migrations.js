const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Asegurar que el paquete 'pg' está instalado
try {
  require.resolve('pg');
} catch (e) {
  console.log('Instalando el paquete "pg" temporalmente para aplicar las migraciones...');
  execSync('npm install --no-save pg', { stdio: 'inherit' });
}

const { Client } = require('pg');

const projectRef = 'jzudbbabifocbrfblmkt';
const password = process.env.DB_PASSWORD || process.argv[2];

if (!password) {
  console.error('\n❌ ERROR: Se requiere la contraseña de la base de datos de Supabase.');
  console.error('Uso: node scripts/apply-migrations.js <tu_contraseña>');
  console.error('O bien, define la variable de entorno DB_PASSWORD.\n');
  process.exit(1);
}

// Usar el Pooler de Supavisor (puerto 6543) por compatibilidad de red IPv4
const connectionString = `postgres://postgres.${projectRef}:${encodeURIComponent(password)}@aws-1-us-east-2.pooler.supabase.com:6543/postgres`;

const client = new Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  try {
    console.log('🔌 Conectando a la base de datos de Supabase vía Connection Pooler (IPv4)...');
    await client.connect();
    console.log('✅ Conexión establecida con éxito.');

    console.log('\n🧹 Limpiando el esquema public de la base de datos para evitar colisiones...');
    await client.query(`
      DROP SCHEMA IF EXISTS public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO postgres;
      GRANT ALL ON SCHEMA public TO public;
      GRANT ALL ON SCHEMA public TO anon;
      GRANT ALL ON SCHEMA public TO authenticated;
      GRANT ALL ON SCHEMA public TO service_role;
    `);
    console.log('✅ Esquema public limpio y re-creado.');

    const migrationsDir = path.join(__dirname, '../supabase/migrations');
    const files = [
      '20260601000000_init_schema.sql',
      '20260601000100_audit_logs.sql',
      '20260601000200_workshop_deliveries_seeds.sql',
      '20260601000300_admin_create_users.sql'
    ];

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      console.log(`\n⏳ Ejecutando migración: ${file}...`);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      // Ejecutar la migración SQL en la base de datos
      await client.query(sql);
      console.log(`✅ Migración completada con éxito: ${file}`);
    }

    console.log('\n⏳ Creando el usuario administrador inicial (Brenda Inés Fuentes)...');
    const adminSql = `
      SELECT public.crear_usuario_sistema(
        'brenda.fuentes@grupoarca.mx',
        'admin123',
        'Brenda Inés Fuentes Hoyos',
        'admin',
        '8f4a13e5-0210-4a81-9b1b-ee9ebcfcb89a'
      );
    `;
    await client.query(adminSql);
    console.log('✅ Usuario administrador creado exitosamente.');
    console.log('\n🎉 ¡Todas las migraciones de Supabase se aplicaron con éxito!');

  } catch (err) {
    console.error('\n❌ Ocurrió un error al aplicar las migraciones:', err.message);
  } finally {
    await client.end();
  }
}

run();
