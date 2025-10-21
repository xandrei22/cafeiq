const mysql = require('mysql2/promise');
require('dotenv').config();

// Parse MYSQL_URL if provided, otherwise use individual parameters
let connectionConfig;

if (process.env.MYSQL_URL) {
    // Parse the MySQL URL (format: mysql://user:password@host:port/database)
    const url = new URL(process.env.MYSQL_URL);
    connectionConfig = {
        host: url.hostname,
        port: url.port || 3306,
        user: url.username,
        password: url.password,
        database: url.pathname.substring(1), // Remove leading slash
        waitForConnections: true,
        connectionLimit: 20,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
        connectTimeout: 20000
    };
} else {
    // Use individual environment variables
    connectionConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'cafeiq',
        waitForConnections: true,
        connectionLimit: 20,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
        connectTimeout: 20000
    };
}

// Create a connection pool for better performance
const pool = mysql.createPool(connectionConfig);

// Test the connection
pool.getConnection()
    .then(connection => {
        console.log('✅ Database connection pool established successfully');
        console.log('📊 Connection details:', {
            host: connectionConfig.host,
            port: connectionConfig.port,
            database: connectionConfig.database,
            user: connectionConfig.user
        });
        connection.release();
    })
    .catch(err => {
        console.error('❌ Failed to establish database connection pool:', err.message);
        console.error('🔧 Connection config used:', {
            host: connectionConfig.host,
            port: connectionConfig.port,
            database: connectionConfig.database,
            user: connectionConfig.user,
            hasPassword: !!connectionConfig.password
        });
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