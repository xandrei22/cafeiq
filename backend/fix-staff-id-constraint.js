const db = require('./config/db');

async function fixStaffIdConstraint() {
    try {
        console.log('🔧 Fixing staff_id foreign key constraint...');
        
        // First, drop the existing constraint if it exists
        try {
            await db.query('ALTER TABLE orders DROP FOREIGN KEY fk_orders_staff_id');
            console.log('✅ Dropped existing foreign key constraint');
        } catch (error) {
            if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
                console.log('ℹ️  Foreign key constraint does not exist, continuing...');
            } else {
                console.log('⚠️  Error dropping constraint:', error.message);
            }
        }
        
        // Add the constraint back with proper NULL handling
        await db.query(`
            ALTER TABLE orders 
            ADD CONSTRAINT fk_orders_staff_id 
            FOREIGN KEY (staff_id) REFERENCES users(id) 
            ON DELETE SET NULL 
            ON UPDATE CASCADE
        `);
        console.log('✅ Added foreign key constraint with proper NULL handling');
        
        // Test the constraint with a NULL value
        console.log('🧪 Testing constraint with NULL value...');
        try {
            await db.query(`
                INSERT INTO orders 
                (order_id, order_number, customer_name, items, total_price, status, payment_status, staff_id) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                `TEST-${Date.now()}`,
                `TEST-${Date.now()}`,
                'Test Customer',
                JSON.stringify([{name: 'Test Item', quantity: 1, price: 10}]),
                10,
                'pending',
                'pending',
                null
            ]);
            console.log('✅ Test insert with NULL staff_id successful');
            
            // Clean up test data
            await db.query('DELETE FROM orders WHERE order_id LIKE ?', [`TEST-%`]);
            console.log('✅ Cleaned up test data');
            
        } catch (error) {
            console.error('❌ Test insert failed:', error.message);
            throw error;
        }
        
        console.log('🎉 staff_id constraint fix completed successfully!');
        
    } catch (error) {
        console.error('❌ Error fixing staff_id constraint:', error);
        throw error;
    } finally {
        // Close the connection properly
        if (db && typeof db.end === 'function') {
            await db.end();
        }
    }
}

// Run the fix
fixStaffIdConstraint().catch(console.error);
