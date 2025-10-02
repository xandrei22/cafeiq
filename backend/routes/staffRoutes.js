const express = require('express');
const router = express.Router();
const db = require('../config/db');
const ingredientDeductionService = require('../services/ingredientDeductionService');
const orderProcessingService = require('../services/orderProcessingService');
const { ensureStaffAuthenticated } = require('../middleware/staffAuthMiddleware');
const ActivityLogger = require('../utils/activityLogger');

// Apply staff authentication to all staff routes
router.use(ensureStaffAuthenticated);

// Lightweight session check for staff (placed after middleware to ensure session is present)
router.get('/check-session', (req, res) => {
    if (req.session && req.session.staffUser) {
        return res.json({
            authenticated: true,
            user: {
                id: req.session.staffUser.id,
                username: req.session.staffUser.username,
                role: req.session.staffUser.role || 'staff'
            }
        });
    }
    return res.status(401).json({ authenticated: false });
});

// Staff dashboard data endpoint
router.get('/dashboard', async(req, res) => {
    try {
        // Perform queries defensively; if one fails, keep defaults rather than 500
        let orderResult = [{ pending: 0, processing: 0, ready: 0, completed: 0, total: 0 }];
        let todayResult = [{ orders: 0, revenue: 0, customers: 0 }];
        let recentOrdersResult = [];
        let lowStockResult = [];
        let eventsResult = [];

        try {
            const [rows] = await db.query(`
                SELECT 
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                    COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
                    COUNT(CASE WHEN status = 'ready' THEN 1 END) as ready,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                    COUNT(*) as total
                FROM orders
            `);
            orderResult = rows;
        } catch (e) { console.warn('Staff dashboard: order metrics failed:', e.message); }

        try {
            const [rows] = await db.query(`
                SELECT 
                    COUNT(*) as orders,
                    COALESCE(SUM(total_price), 0) as revenue,
                    COUNT(DISTINCT customer_id) as customers
                FROM orders 
                WHERE DATE(order_time) = CURDATE()
            `);
            todayResult = rows;
        } catch (e) { console.warn('Staff dashboard: today stats failed:', e.message); }

        try {
            const [rows] = await db.query(`
                SELECT 
                    order_id as id,
                    customer_name as customer,
                    items,
                    total_price as amount,
                    status,
                    order_time as time,
                    table_number as tableNumber
                FROM orders 
                WHERE status IN ('pending', 'processing', 'ready')
                ORDER BY order_time DESC 
                LIMIT 10
            `);
            recentOrdersResult = rows;
        } catch (e) { console.warn('Staff dashboard: recent orders failed:', e.message); }

        try {
            const [rows] = await db.query(`
                SELECT 
                    id,
                    name,
                    actual_quantity as currentStock,
                    reorder_level as reorderLevel,
                    actual_unit as unit
                FROM ingredients 
                WHERE actual_quantity <= reorder_level
                ORDER BY actual_quantity ASC
                LIMIT 10
            `);
            lowStockResult = rows;
        } catch (e) { console.warn('Staff dashboard: low stock failed:', e.message); }

        try {
            const [rows] = await db.query(`
                SELECT 
                    id,
                    customer_name as customer,
                    event_type as eventType,
                    event_date as eventDate,
                    guest_count as guestCount,
                    status
                FROM events 
                WHERE event_date >= CURDATE() AND status IN ('pending', 'confirmed')
                ORDER BY event_date ASC
                LIMIT 10
            `);
            eventsResult = rows;
        } catch (e) { console.warn('Staff dashboard: events failed:', e.message); }

        const dashboardData = {
            orders: {
                pending: orderResult[0].pending || 0,
                processing: orderResult[0].processing || 0,
                ready: orderResult[0].ready || 0,
                completed: orderResult[0].completed || 0,
                total: orderResult[0].total || 0
            },
            todayStats: {
                orders: todayResult[0].orders || 0,
                revenue: parseFloat(todayResult[0].revenue) || 0,
                customers: todayResult[0].customers || 0
            },
            recentOrders: recentOrdersResult.map(order => {
                let itemNames = [];
                try {
                    const parsed = JSON.parse(order.items || '[]');
                    itemNames = Array.isArray(parsed) ? parsed.map(item => item && item.name ? item.name : 'Item') : [];
                } catch (e) {
                    itemNames = [];
                }
                return {
                    id: order.id,
                    customer: order.customer,
                    items: itemNames,
                    amount: parseFloat(order.amount),
                    status: order.status,
                    time: order.time,
                    tableNumber: order.tableNumber
                };
            }),
            lowStockItems: lowStockResult.map(item => ({
                id: item.id,
                name: item.name,
                currentStock: parseFloat(item.currentStock),
                reorderLevel: parseFloat(item.reorderLevel),
                unit: item.unit
            })),
            upcomingEvents: eventsResult.map(event => ({
                id: event.id,
                customer: event.customer,
                eventDate: event.eventDate,
                guestCount: event.guestCount,
                status: event.status
            }))
        };

        res.json({
            success: true,
            data: {
                revenue: {
                    today: dashboardData.todayStats.revenue,
                    week: 0, // You can add week calculation if needed
                    month: 0, // You can add month calculation if needed
                    growth: 0 // You can add growth calculation if needed
                },
                orders: {
                    pending: dashboardData.orders.pending,
                    processing: dashboardData.orders.processing,
                    completed: dashboardData.orders.completed,
                    total: dashboardData.orders.total
                },
                customers: {
                    total: dashboardData.todayStats.customers,
                    new: dashboardData.todayStats.customers,
                    active: dashboardData.todayStats.customers
                },
                inventory: {
                    total: 0, // You can add total inventory count if needed
                    low_stock: dashboardData.lowStockItems.length,
                    out_of_stock: 0 // You can add out of stock count if needed
                }
            }
        });

    } catch (error) {
        console.error('Error fetching staff dashboard data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch dashboard data'
        });
    }
});

// Staff dashboard: sales over last 7 days
router.get('/dashboard/sales', async(req, res) => {
    try {
        // Get revenue per day for the last 7 days (including today)
        const [rows] = await db.query(`
            SELECT 
                DATE(order_time) as order_date,
                COALESCE(SUM(total_price), 0) as revenue
            FROM orders
            WHERE order_time >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
            GROUP BY DATE(order_time)
            ORDER BY order_date ASC
        `);

        // Build a continuous 7-day series
        const labels = [];
        const data = [];
        const today = new Date();
        const map = new Map(rows.map(r => [new Date(r.order_date).toDateString(), Number(r.revenue) || 0]));
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const key = d.toDateString();
            labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
            data.push(map.get(key) || 0);
        }

        res.json({ labels, data });
    } catch (error) {
        console.error('Error fetching staff dashboard sales:', error);
        res.status(500).json({ labels: [], data: [] });
    }
});

// Staff dashboard: most used ingredients (proxy based on depletion vs reorder level)
router.get('/dashboard/ingredients', async(req, res) => {
    try {
        // Estimate usage as (reorder_level - actual_quantity), clipped at 0
        const [rows] = await db.query(`
            SELECT 
                name,
                GREATEST(reorder_level - actual_quantity, 0) AS used_estimate
            FROM ingredients
            ORDER BY used_estimate DESC
            LIMIT 6
        `);

        const labels = rows.map(r => r.name);
        const data = rows.map(r => Number(r.used_estimate) || 0);
        res.json({ labels, data });
    } catch (error) {
        console.error('Error fetching staff dashboard ingredients:', error);
        res.status(500).json({ labels: [], data: [] });
    }
});

// Staff dashboard: most bought menu items (from recent orders)
router.get('/dashboard/menu-items', async(req, res) => {
    try {
        // Fetch recent orders and aggregate ALL items with proper menu item names
        const [orders] = await db.query(`
            SELECT items
            FROM orders
            WHERE payment_status = 'paid'
                AND order_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            ORDER BY order_time DESC
            LIMIT 200
        `);

        const counts = new Map();
        for (const row of orders) {
            let parsed = [];
            try {
                parsed = JSON.parse(row.items || '[]');
            } catch (e) {
                parsed = [];
            }
            for (const item of parsed) {
                // Try multiple possible field names for menu item ID
                const menuItemId = item && (item.menu_item_id || item.menuItemId || item.id) ?
                    (item.menu_item_id || item.menuItemId || item.id) : null;
                const qty = Number(item && item.quantity ? item.quantity : 1);

                if (menuItemId) {
                    // Get the actual menu item name from the database
                    const [menuItem] = await db.query(`
                        SELECT name FROM menu_items WHERE id = ?
                    `, [menuItemId]);

                    const name = menuItem.length > 0 ? menuItem[0].name : 'Unknown';
                    counts.set(name, (counts.get(name) || 0) + qty);
                } else {
                    // Fallback to stored name if no menu_item_id
                    const name = (item && item.name) ? item.name : 'Unknown';
                    counts.set(name, (counts.get(name) || 0) + qty);
                }
            }
        }

        const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
        const labels = sorted.map(([name]) => name);
        const data = sorted.map(([, count]) => count);
        res.json({ labels, data });
    } catch (error) {
        console.error('Error fetching staff dashboard menu items:', error);
        res.status(500).json({ labels: [], data: [] });
    }
});

// Staff dashboard: staff performance data
router.get('/dashboard/staff-performance', async(req, res) => {
    try {
        const { period = 'month' } = req.query; // 'day' or 'month'

        let dateFormat, groupBy, interval;

        if (period === 'day') {
            dateFormat = '%Y-%m-%d';
            groupBy = 'DATE(o.order_time)';
            interval = 'INTERVAL 7 DAY';
        } else {
            dateFormat = '%Y-%m';
            groupBy = 'DATE_FORMAT(o.order_time, "%Y-%m")';
            interval = 'INTERVAL 6 MONTH';
        }

        // Get staff performance data
        const [staffData] = await db.query(`
            SELECT 
                CONCAT(u.first_name, ' ', u.last_name) as staff_name,
                u.id as staff_id,
                ${groupBy} as period,
                SUM(o.total_price) as total_sales,
                COUNT(o.id) as order_count,
                AVG(o.total_price) as avg_order_value
            FROM orders o
            JOIN users u ON o.staff_id = u.id
            WHERE o.payment_status = 'paid'
                AND o.order_time >= DATE_SUB(NOW(), ${interval})
            GROUP BY u.id, u.first_name, u.last_name, ${groupBy}
            ORDER BY period DESC, total_sales DESC
        `);

        // Get daily sales trend for the last 7 days or monthly trend for last 6 months
        const [trendData] = await db.query(`
            SELECT 
                ${groupBy} as period,
                SUM(o.total_price) as total_sales,
                COUNT(o.id) as order_count
            FROM orders o
            WHERE o.payment_status = 'paid'
                AND o.order_time >= DATE_SUB(NOW(), ${interval})
            GROUP BY ${groupBy}
            ORDER BY period ASC
        `);

        // Process staff data
        const staffPerformance = {};
        staffData.forEach(item => {
            const key = item.staff_id;
            if (!staffPerformance[key]) {
                staffPerformance[key] = {
                    staff_name: item.staff_name,
                    staff_id: item.staff_id,
                    periods: [],
                    total_sales: 0,
                    total_orders: 0,
                    avg_order_value: 0
                };
            }

            staffPerformance[key].periods.push({
                period: item.period,
                sales: parseFloat(item.total_sales) || 0,
                orders: parseInt(item.order_count) || 0,
                avg_order_value: parseFloat(item.avg_order_value) || 0
            });

            staffPerformance[key].total_sales += parseFloat(item.total_sales) || 0;
            staffPerformance[key].total_orders += parseInt(item.order_count) || 0;
        });

        // Calculate average order value for each staff
        Object.values(staffPerformance).forEach(staff => {
            staff.avg_order_value = staff.total_orders > 0 ? staff.total_sales / staff.total_orders : 0;
        });

        // Sort staff by total sales
        const sortedStaff = Object.values(staffPerformance)
            .sort((a, b) => b.total_sales - a.total_sales)
            .slice(0, 10); // Top 10 staff

        // Process trend data
        const trend = {
            labels: trendData.map(item => item.period),
            sales: trendData.map(item => parseFloat(item.total_sales) || 0),
            orders: trendData.map(item => parseInt(item.order_count) || 0)
        };

        res.json({
            success: true,
            period: period,
            staff_performance: sortedStaff,
            trend: trend
        });
    } catch (error) {
        console.error('Staff performance error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch staff performance data'
        });
    }
});

// Get all orders for staff management
router.get('/orders', async(req, res) => {
    try {
        const [ordersResult] = await db.query(`
            SELECT 
                order_id as id,
                customer_name,
                items,
                total_price,
                status,
                order_type,
                table_number,
                notes,
                order_time as order_time,
                estimated_ready_time,
                payment_status,
                payment_method,
                receipt_path
            FROM orders 
            ORDER BY order_time DESC
        `);

        // Process orders and enrich items with menu item names
        const orders = await Promise.all(ordersResult.map(async(order) => {
            const items = JSON.parse(order.items || '[]');

            // Enrich items with menu item names and prices
            const enrichedItems = await Promise.all(items.map(async(item) => {
                // Check if item already has name and price (customer orders)
                if (item.name && item.price !== undefined) {
                    return item; // Already enriched, return as-is
                }

                // For admin/staff orders, enrich with menu item data
                try {
                    const menuItemId = item.menu_item_id || item.menuItemId;
                    if (!menuItemId) {
                        return {
                            ...item,
                            name: 'Unknown Item',
                            price: item.custom_price || 0,
                            base_price: 0
                        };
                    }

                    const [menuItems] = await db.query('SELECT name, base_price FROM menu_items WHERE id = ?', [menuItemId]);
                    const menuItem = menuItems[0];

                    return {
                        ...item,
                        name: menuItem ? menuItem.name : `Item ${menuItemId}`,
                        price: item.custom_price || (menuItem ? parseFloat(menuItem.base_price) : 0),
                        base_price: menuItem ? parseFloat(menuItem.base_price) : 0
                    };
                } catch (error) {
                    console.error('Error fetching menu item:', error);
                    return {
                        ...item,
                        name: `Item ${item.menu_item_id || item.menuItemId || 'unknown'}`,
                        price: item.custom_price || 0,
                        base_price: 0
                    };
                }
            }));

            return {
                orderId: order.id, // Map id to orderId for frontend compatibility
                order_id: order.id, // Also include order_id for compatibility
                id: order.id,
                customer_name: order.customer_name,
                items: enrichedItems,
                total_price: parseFloat(order.total_price),
                status: order.status,
                order_type: order.order_type,
                table_number: order.table_number,
                order_time: order.order_time,
                estimated_ready_time: order.estimated_ready_time,
                notes: order.notes,
                payment_status: order.payment_status,
                payment_method: order.payment_method,
                receipt_path: order.receipt_path
            };
        }));

        res.json({
            success: true,
            orders
        });

    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch orders'
        });
    }
});

// Update order status
router.put('/orders/:orderId/status', async(req, res) => {
    try {
        const { orderId } = req.params;
        const { status, cancelledBy, cancellationReason, cancelledAt } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                error: 'Status is required'
            });
        }

        // Get current order status and full order details for logging and deduction
        const [currentOrder] = await db.query('SELECT * FROM orders WHERE order_id = ?', [orderId]);
        const oldStatus = currentOrder[0] ? currentOrder[0].status : undefined;
        const order = currentOrder[0];

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        // If cancelling, record additional cancellation details
        if (status === 'cancelled') {
            await db.query(`
                UPDATE orders 
                SET 
                    status = ?, 
                    updated_at = NOW(),
                    cancelled_by = ?,
                    cancellation_reason = ?,
                    cancelled_at = ?
                WHERE order_id = ?
            `, [
                status,
                cancelledBy || (req.session.staffUser && req.session.staffUser.id) || 'staff',
                cancellationReason || 'Cancelled by staff',
                cancelledAt || new Date(),
                orderId
            ]);
        } else {
            // Regular status update
            await db.query(`
                UPDATE orders 
                SET status = ?, updated_at = NOW()
                WHERE order_id = ?
            `, [status, orderId]);
        }

        // If status is changing to 'ready', deduct ingredients
        if (status === 'ready') {
            try {
                const items = JSON.parse(order.items || '[]');
                const itemsForDeduction = items.map(item => ({
                    menuItemId: item.menu_item_id || item.id,
                    quantity: item.quantity || 1,
                    customizations: item.customizations || null,
                    name: item.name
                }));

                console.log('🔔 Staff status update: Deducting ingredients for order', orderId);
                await ingredientDeductionService.deductIngredientsForOrder(order.id, itemsForDeduction, req);
            } catch (deductionError) {
                console.error('Failed to deduct ingredients during status update:', deductionError);
                // Don't fail the status update if ingredient deduction fails
            }
        }

        // Log the activity
        if (req.session.staffUser && req.session.staffUser.id) {
            await ActivityLogger.logStaffActivity(
                req.session.staffUser.id,
                'order_status_update',
                'order',
                orderId, { status: oldStatus }, { status: status },
                `Updated order ${orderId} status from ${oldStatus} to ${status}`,
                req
            );
        }

        res.json({
            success: true,
            message: 'Order status updated successfully'
        });

    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update order status'
        });
    }
});

// Get order details
router.get('/orders/:orderId', async(req, res) => {
    try {
        const { orderId } = req.params;

        const [orderResult] = await db.query(`
            SELECT 
                order_id as id,
                customer_name,
                items,
                total_price,
                status,
                order_type,
                table_number,
                order_time as order_time,
                estimated_ready_time,
                notes,
                payment_status,
                payment_method
            FROM orders 
            WHERE order_id = ?
        `, [orderId]);

        if (orderResult.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        const order = orderResult[0];
        const orderData = {
            id: order.id,
            customer_name: order.customer_name,
            items: JSON.parse(order.items || '[]'),
            total_price: parseFloat(order.total_price),
            status: order.status,
            order_type: order.order_type,
            table_number: order.table_number,
            order_time: order.order_time,
            estimated_ready_time: order.estimated_ready_time,
            notes: order.notes,
            payment_status: order.payment_status,
            payment_method: order.payment_method
        };

        res.json({
            success: true,
            order: orderData
        });

    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch order details'
        });
    }
});

// Get inventory alerts
router.get('/inventory/alerts', async(req, res) => {
    try {
        const [alertsResult] = await db.query(`
            SELECT 
                id,
                name,
                category,
                actual_quantity,
                actual_unit,
                reorder_level,
                reorder_unit,
                supplier,
                cost_per_unit,
                last_updated
            FROM ingredients 
            WHERE actual_quantity <= reorder_level
            ORDER BY actual_quantity ASC
        `);

        const alerts = alertsResult.map(item => ({
            id: item.id,
            name: item.name,
            category: item.category,
            actual_quantity: parseFloat(item.actual_quantity),
            actual_unit: item.actual_unit,
            reorder_level: parseFloat(item.reorder_level),
            reorder_unit: item.reorder_unit,
            supplier: item.supplier,
            cost_per_unit: parseFloat(item.cost_per_unit),
            last_updated: item.last_updated
        }));

        res.json({
            success: true,
            alerts
        });

    } catch (error) {
        console.error('Error fetching inventory alerts:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch inventory alerts'
        });
    }
});

// Get all inventory items for staff
router.get('/inventory', async(req, res) => {
    try {
        const [inventoryResult] = await db.query(`
            SELECT 
                id,
                name,
                actual_quantity,
                reorder_level,
                actual_unit,
                category,
                description,
                sku,
                storage_location,
                cost_per_actual_unit AS cost_per_unit,
                extra_price_per_unit,
                days_of_stock,
                created_at,
                updated_at
            FROM ingredients 
            ORDER BY name ASC
        `);

        const inventory = inventoryResult.map(item => ({
            id: item.id,
            name: item.name,
            actual_quantity: parseFloat(item.actual_quantity),
            reorder_level: parseFloat(item.reorder_level),
            actual_unit: item.actual_unit,
            category: item.category,
            description: item.description,
            sku: item.sku,
            storage_location: item.storage_location,
            cost_per_unit: item.cost_per_unit != null ? parseFloat(item.cost_per_unit) : null,
            extra_price_per_unit: item.extra_price_per_unit != null ? parseFloat(item.extra_price_per_unit) : null,
            days_of_stock: item.days_of_stock != null ? Number(item.days_of_stock) : null,
            created_at: item.created_at,
            updated_at: item.updated_at,
            status: item.actual_quantity === 0 ? 'out' : item.actual_quantity <= item.reorder_level ? 'low' : 'normal'
        }));

        // Do not log viewing inventory/ingredients

        res.json({
            success: true,
            inventory
        });

    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch inventory'
        });
    }
});

// Get upcoming events
router.get('/events/upcoming', async(req, res) => {
    try {
        const [eventsResult] = await db.query(`
            SELECT 
                id,
                customer_name,
                event_type,
                event_date,
                guest_count,
                status,
                venue,
                special_requests
            FROM events 
            WHERE event_date >= CURDATE() AND status IN ('pending', 'confirmed')
            ORDER BY event_date ASC
        `);

        const events = eventsResult.map(event => ({
            id: event.id,
            customer_name: event.customer_name,
            event_type: event.event_type,
            event_date: event.event_date,
            guest_count: event.guest_count,
            status: event.status,
            venue: event.venue,
            special_requests: event.special_requests
        }));

        res.json({
            success: true,
            events
        });

    } catch (error) {
        console.error('Error fetching upcoming events:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch upcoming events'
        });
    }
});

// Payment verification routes for staff (same as admin)
// Verify payment and process order (Staff)
router.post('/orders/:orderId/verify-payment', async(req, res) => {
    try {
        const { orderId } = req.params;
        const { paymentMethod, verifiedBy } = req.body;

        // Get order details (accept DB id or UUID)
        const [orderResult] = await db.query('SELECT * FROM orders WHERE id = ? OR order_id = ?', [orderId, orderId]);
        if (orderResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const order = orderResult[0];

        // Verify the order is pending verification
        if (order.status !== 'pending_verification') {
            return res.status(400).json({
                success: false,
                message: `Order status is ${order.status}, cannot verify payment`
            });
        }

        // Update payment status only - let trigger handle status change
        await db.query('UPDATE orders SET payment_status = ?, payment_method = ? WHERE id = ?', ['paid', paymentMethod || 'cash', order.id]);

        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            // Emit to specific order room
            io.to(`order-${order.order_id}`).emit('order-updated', {
                orderId: order.order_id,
                status: 'pending',
                paymentStatus: 'paid',
                paymentMethod: paymentMethod || 'cash',
                timestamp: new Date()
            });
            // Emit to staff and admin rooms
            io.to('staff-room').emit('order-updated', {
                orderId: order.order_id,
                status: 'pending',
                paymentStatus: 'paid',
                paymentMethod: paymentMethod || 'cash',
                timestamp: new Date()
            });
            io.to('admin-room').emit('order-updated', {
                orderId: order.order_id,
                status: 'pending',
                paymentStatus: 'paid',
                paymentMethod: paymentMethod || 'cash',
                timestamp: new Date()
            });
            // Broadcast to all customers
            io.emit('order-updated', {
                orderId: order.order_id,
                status: 'pending',
                paymentStatus: 'paid',
                paymentMethod: paymentMethod || 'cash',
                timestamp: new Date()
            });
        }

        // Note: Ingredient deduction now happens when order is marked as 'ready', not during payment verification

        // Log payment verification
        await db.query(`
            INSERT INTO payment_transactions 
            (order_id, payment_method, amount, transaction_id, reference, status, created_at)
            VALUES (?, ?, ?, ?, ?, 'completed', NOW())
        `, [orderId, paymentMethod || 'cash', order.total_price, `CASH_${Date.now()}`, `Verified by ${verifiedBy || 'staff'}`, 'completed']);

        // Log the activity
        if (req.session.staffUser && req.session.staffUser.id) {
            await ActivityLogger.logStaffActivity(
                req.session.staffUser.id,
                'payment_verification',
                'payment',
                orderId, { payment_status: 'pending' }, { payment_status: 'paid', payment_method: paymentMethod || 'cash' },
                `Verified payment for order ${orderId} using ${paymentMethod || 'cash'}`,
                req
            );
        }

        // Emit real-time update
        if (io) {
            io.emit('order-updated', {
                orderId,
                status: 'confirmed',
                paymentStatus: 'paid',
                verifiedBy: verifiedBy || 'staff'
            });
            io.emit('payment-updated', {
                orderId,
                paymentStatus: 'paid',
                paymentMethod: paymentMethod || 'cash'
            });
        }

        res.json({
            success: true,
            message: 'Payment verified successfully and ingredients deducted',
            orderId,
            status: 'confirmed'
        });

    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({
            success: false,
            message: `Failed to verify payment: ${error.message}`
        });
    }
});

// Get orders that need payment verification
router.get('/orders/pending-verification', async(req, res) => {
    try {
        const [ordersResult] = await db.query(`
            SELECT 
                id,
                customer_name,
                items,
                total_price,
                payment_method,
                status,
                notes,
                table_number,
                order_time as order_time
            FROM orders 
            WHERE status = 'pending_verification'
            ORDER BY order_time ASC
        `);

        const orders = ordersResult.map(order => ({
            id: order.id,
            customer_name: order.customer_name,
            items: JSON.parse(order.items || '[]'),
            total_price: parseFloat(order.total_price),
            payment_method: order.payment_method,
            status: order.status,
            notes: order.notes,
            table_number: order.table_number,
            order_time: order.order_time
        }));

        res.json({
            success: true,
            orders
        });

    } catch (error) {
        console.error('Error fetching pending verification orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pending verification orders'
        });
    }
});

// Get staff's own activity logs
router.get('/activity-logs', async(req, res) => {
    try {
        const { page = 1, limit = 50, action_type = 'all', start_date, end_date } = req.query;
        const offset = (page - 1) * limit;
        const staffId = req.session.staffUser.id;

        let query = `
            SELECT 
                sal.id,
                sal.staff_id as user_id,
                u.username as username,
                sal.action_type,
                sal.target_type,
                sal.target_id,
                sal.old_values,
                sal.new_values,
                sal.description,
                sal.created_at
            FROM staff_activity_log sal
            JOIN users u ON sal.staff_id = u.id
            WHERE sal.staff_id = ?
        `;

        const params = [staffId];

        if (action_type !== 'all') {
            query += ' AND sal.action_type = ?';
            params.push(action_type);
        }

        if (start_date) {
            query += ' AND sal.created_at >= ?';
            params.push(start_date);
        }

        if (end_date) {
            query += ' AND sal.created_at <= ?';
            params.push(end_date + ' 23:59:59');
        }

        // Get total count
        const countQuery = query.replace('SELECT sal.id, sal.staff_id as user_id, u.username as username, sal.action_type, sal.target_type, sal.target_id, sal.old_values, sal.new_values, sal.description, sal.created_at', 'SELECT COUNT(*) as total');
        const [countResult] = await db.query(countQuery, params);
        const total = countResult[0].total;

        // Get paginated results
        query += ' ORDER BY sal.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const [activities] = await db.query(query, params);

        // Format the activities
        const formattedActivities = activities.map(activity => ({
            id: activity.id,
            user_type: 'staff',
            user_id: activity.user_id,
            username: activity.username,
            action_type: activity.action_type,
            target_type: activity.target_type,
            target_id: activity.target_id,
            old_values: activity.old_values ? JSON.parse(activity.old_values) : null,
            new_values: activity.new_values ? JSON.parse(activity.new_values) : null,
            description: activity.description,
            created_at: activity.created_at,
            formatted_date: new Date(activity.created_at).toLocaleString()
        }));

        res.json({
            success: true,
            activities: formattedActivities,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                total_pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching staff activity logs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch activity logs'
        });
    }
});

// Get staff activity log statistics
router.get('/activity-logs/stats', async(req, res) => {
    try {
        const { start_date, end_date } = req.query;
        const staffId = req.session.staffUser.id;

        // Build date filter
        let dateFilter = 'WHERE sal.staff_id = ?';
        const params = [staffId];

        if (start_date) {
            dateFilter += ' AND sal.created_at >= ?';
            params.push(start_date);
        }

        if (end_date) {
            dateFilter += ' AND sal.created_at <= ?';
            params.push(end_date + ' 23:59:59');
        }

        // Get action type stats
        const [actionTypeStats] = await db.query(`
            SELECT 
                action_type,
                COUNT(*) as count
            FROM staff_activity_log sal
            ${dateFilter}
            GROUP BY action_type
            ORDER BY count DESC
        `, params);

        // Get recent activity (last 7 days)
        const [recentActivity] = await db.query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as count
            FROM staff_activity_log sal
            WHERE sal.staff_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `, [staffId]);

        res.json({
            success: true,
            stats: {
                by_action_type: actionTypeStats,
                recent_activity: recentActivity
            }
        });

    } catch (error) {
        console.error('Error fetching staff activity log stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch activity log statistics'
        });
    }
});

// Staff: Get own activity logs only
router.get('/activity-logs', async(req, res) => {
    try {
        const staffId = req.session.staffUser && req.session.staffUser.id;
        if (!staffId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const { page = 1, limit = 20, action_type = 'all', start_date, end_date } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let baseQuery = `
            SELECT 
                sal.id,
                sal.staff_id,
                u.username as username,
                sal.action_type,
                sal.target_type,
                sal.target_id,
                sal.old_values,
                sal.new_values,
                sal.description,
                sal.created_at
            FROM staff_activity_log sal
            JOIN users u ON sal.staff_id = u.id
            WHERE sal.staff_id = ?
        `;

        const params = [staffId];
        const whereExtra = [];

        if (action_type !== 'all') {
            whereExtra.push('sal.action_type = ?');
            params.push(action_type);
        }

        if (start_date) {
            whereExtra.push('sal.created_at >= ?');
            params.push(start_date);
        }

        if (end_date) {
            whereExtra.push('sal.created_at <= ?');
            params.push(`${end_date} 23:59:59`);
        }

        if (whereExtra.length > 0) {
            baseQuery += ` AND ${whereExtra.join(' AND ')}`;
        }

        const countQuery = `SELECT COUNT(*) as total FROM (${baseQuery}) as t`;
        const [countRows] = await db.query(countQuery, params);
        const total = countRows[0].total;

        const dataQuery = `${baseQuery} ORDER BY sal.created_at DESC LIMIT ? OFFSET ?`;
        const dataParams = params.concat([parseInt(limit), offset]);
        const [rows] = await db.query(dataQuery, dataParams);

        const activities = rows.map(a => ({
            id: a.id,
            user_type: 'staff',
            user_id: a.staff_id,
            username: a.username,
            action_type: a.action_type,
            target_type: a.target_type,
            target_id: a.target_id,
            old_values: a.old_values ? JSON.parse(a.old_values) : null,
            new_values: a.new_values ? JSON.parse(a.new_values) : null,
            description: a.description,
            created_at: a.created_at,
            formatted_date: new Date(a.created_at).toLocaleString()
        }));

        res.json({
            success: true,
            activities,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                total_pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching staff activity logs:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch staff activity logs' });
    }
});

// Staff dashboard SSE endpoint
router.get('/dashboard/stream', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection message
    res.write('data: {"type": "connected"}\n\n');

    // Keep connection alive with periodic heartbeat
    const heartbeat = setInterval(() => {
        res.write('data: {"type": "heartbeat"}\n\n');
    }, 30000);

    // Clean up on connection close
    req.on('close', () => {
        clearInterval(heartbeat);
    });
});

module.exports = router;