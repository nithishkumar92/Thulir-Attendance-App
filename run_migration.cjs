const { Pool } = require('pg');
const fs = require('fs');

async function migrate() {
    const envLines = fs.readFileSync('.env.local', 'utf8').split('\n');
    const dbUrlLine = envLines.find(l => l.startsWith('VITE_SUPABASE_URL=') || l.startsWith('COCKROACH_DB_URL='));
    
    // We actually need the dbUrl to be the cockroach one from our .env.local 
    const isCockroach = envLines.find(l => l.startsWith('COCKROACH_DB_URL='));
    
    if(!isCockroach) {
        console.error("No cockroach db url found, you are likely missing it in your .env.local file");
        process.exit(1);
    }
    
    const dbUrl = isCockroach.split('=')[1].trim().replace(/['"]+/g, '');

    const pool = new Pool({
        connectionString: dbUrl.replace('?sslmode=verify-full', '').replace('&sslmode=verify-full', ''),
        ssl: { rejectUnauthorized: false }
    });

    try {
        const sql = fs.readFileSync('migration_new_features.sql', 'utf8');
        
        console.log("Starting Migration...");
        
        // Split by semicolon and run sequentially to avoid giant query block parsing issues
        const statements = sql
                            .split(';')
                            .map(s => s.trim())
                            .filter(s => s.length > 0);

        for(const stmt of statements) {
            console.log("Executing:", stmt.substring(0, 50).replace(/\n/g, ' '), "...");
            await pool.query(stmt);
        }

        console.log("Migration Complete!");
        process.exit(0);
    } catch (e) {
        console.error("Migration Failed:", e);
        process.exit(1);
    }
}

migrate();
