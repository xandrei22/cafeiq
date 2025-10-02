const mysql = require('mysql2/promise');
require('dotenv').config();

// Create a connection pool for better performance
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'cafe_management',
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectTimeout: 20000
});

// Test the connection
pool.getConnection()
    .then(connection => {
        console.log('✅ Database connection pool established successfully');
        connection.release();
    })
    .catch(err => {
        console.error('❌ Failed to establish database connection pool:', err.message);
    });

// Create a wrapper object that provides both pool methods and backward compatibility
const db = {
    // Pool methods
    getConnection: () => pool.getConnection(),
    query: (sql, params) => pool.query(sql, params),
    execute: (sql, params) => pool.execute(sql, params),

    // Additional pool methods
    beginTransaction: () => pool.getConnection().then(conn => conn.beginTransaction()),
    commit: (connection) => connection.commit(),
    rollback: (connection) => connection.rollback(),
    release: (connection) => connection.release(),
    pool
};

// Export the wrapper object
module.exports = db;