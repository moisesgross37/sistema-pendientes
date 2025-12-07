const { Pool } = require('pg');

// Configuración de conexión (la misma que usas en tu servidor local)
const pool = new Pool({
    database: 'moisesgross', 
    ssl: false 
});

async function crearTablaMarketing() {
    console.log("--- 🚀 Creando Sistema de Marketing/Redes ---");
    const client = await pool.connect();
    try {
        // 1. Crear la tabla principal 'marketing_projects'
        // Usamos JSONB para guardar los datos de contacto y el estado de los servicios
        // Esto permite que el sistema sea flexible para cambios futuros.
        await client.query(`
            CREATE TABLE IF NOT EXISTS marketing_projects (
                id SERIAL PRIMARY KEY,
                nombre_centro TEXT NOT NULL,
                
                -- Datos de Contacto (Guardados en un bloque JSON)
                -- Ejemplo: { "nombre": "Juan", "telefono": "809...", "rol": "Director" }
                contacto_directivo JSONB DEFAULT '{}',
                contacto_presidente JSONB DEFAULT '{}',
                
                -- EL CEREBRO DEL SISTEMA: Estado de los Servicios
                -- Aquí guardaremos las fechas reales de los eventos y si ya se subieron a redes
                servicios_estado JSONB DEFAULT '{}',
                
                -- Campos de Auditoría
                created_at TIMESTAMPTZ DEFAULT NOW(),
                status TEXT DEFAULT 'Activo' -- 'Activo' o 'Archivado'
            );
        `);
        
        console.log("✅ ¡ÉXITO! Tabla 'marketing_projects' creada correctamente.");
        console.log("📊 La base de datos está lista para recibir datos de Marketing.");

    } catch (error) {
        console.error("❌ Error al crear la tabla:", error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

crearTablaMarketing();