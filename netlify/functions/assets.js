const { Client } = require('pg');

exports.handler = async (event, context) => {
    // Netlify provides these env vars automatically when you add the database
    const client = new Client({
        connectionString: process.env.NETLIFY_DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        // Create table if it doesn't exist
        await client.query(`
      CREATE TABLE IF NOT EXISTS assets (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT,
        serial_number TEXT,
        status TEXT,
        assigned_to TEXT,
        purchase_date DATE,
        price NUMERIC,
        location TEXT
      );
    `);

        // Migration: Ensure location column exists for existing tables
        try {
            await client.query('ALTER TABLE assets ADD COLUMN IF NOT EXISTS location TEXT');
        } catch (e) {
            // Ignore if column already exists or other non-critical error
            console.log('Migration note:', e.message);
        }

        const method = event.httpMethod;
        const body = event.body ? JSON.parse(event.body) : {};

        if (method === 'GET') {
            const res = await client.query('SELECT * FROM assets ORDER BY id DESC');
            return {
                statusCode: 200,
                body: JSON.stringify(res.rows)
            };
        }

        if (method === 'POST') {
            // ADD ASSET
            const { name, category, serialNumber, price, purchaseDate, location } = body;
            const query = `
        INSERT INTO assets (name, category, serial_number, status, assigned_to, price, purchase_date, location)
        VALUES ($1, $2, $3, 'available', '', $4, $5, $6)
        RETURNING *
      `;
            const values = [name, category, serialNumber, price, purchaseDate, location];
            const res = await client.query(query, values);
            return {
                statusCode: 200,
                body: JSON.stringify(res.rows[0])
            };
        }

        if (method === 'PUT') {
            // UPDATE ASSET (Check-in/Check-out/Edit)
            const { id, status, assignedTo, name, price, location } = body;

            // Dynamic update query builder could be better, but keeping it simple
            let query, values;

            if (status && assignedTo !== undefined) {
                // Check-in / Check-out
                query = 'UPDATE assets SET status = $1, assigned_to = $2 WHERE id = $3 RETURNING *';
                values = [status, assignedTo, id];
            } else {
                // Edit details
                query = 'UPDATE assets SET name = $1, price = $2, location = $3 WHERE id = $4 RETURNING *';
                values = [name, price, location, id];
            }

            const res = await client.query(query, values);
            return {
                statusCode: 200,
                body: JSON.stringify(res.rows[0])
            };
        }

        if (method === 'DELETE') {
            const { id } = body;
            await client.query('DELETE FROM assets WHERE id = $1', [id]);
            return { statusCode: 200, body: 'Deleted' };
        }

        return { statusCode: 405, body: 'Method Not Allowed' };

    } catch (error) {
        console.error('Database Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    } finally {
        await client.end();
    }
};
