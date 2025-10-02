import React, { useEffect, useState } from 'react';
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import { io, Socket } from 'socket.io-client';
import { CheckCircle, Clock, Coffee, Utensils, Bell, Calendar, X } from 'lucide-react';
import './progress-bar.css';
import ProgressBar from '../ui/ProgressBar';

interface Order {
  id: string;
  order_id: string;
  customer_name: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    customizations?: any;
  }>;
  total_price: string | number;
  status: 'pending' | 'pending_verification' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed' | 'pending_verification';
  payment_method?: 'cash' | 'gcash' | 'paymaya';
  order_type: 'dine_in' | 'takeout';
  table_number?: number;
  queue_position?: number;
  estimated_ready_time?: string;
  order_time: string;
  completed_time?: string;
  notes?: string;
}

const CustomerOrders: React.FC = () => {
  const { loading, authenticated, user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showAll, setShowAll] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<Order | null>(null);

  useEffect(() => {
    console.log('🔍 CustomerOrders useEffect triggered:');
    console.log('  - loading:', loading);
    console.log('  - authenticated:', authenticated);
    console.log('  - user:', user);
    console.log('  - user?.email:', user?.email);
    
    if (!loading && !authenticated) {
      console.log('❌ Not authenticated, redirecting to login');
      navigate("/customer-login");
    } else if (authenticated && user) {
      console.log('✅ Authenticated, fetching orders for:', user.email);
      
      // Initialize Socket.IO connection for real-time updates
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const newSocket = io(API_URL);
      setSocket(newSocket);

      // Join customer room for real-time updates
      console.log('🔌 Joining customer room with email:', user.email);
      newSocket.emit('join-customer-room', { customerEmail: user.email });

      // Listen for real-time updates - automatic refresh
      newSocket.on('order-updated', (updateData) => {
        console.log('📡 Order updated received:', updateData);
        console.log('🔄 Auto-refreshing orders due to order-updated event');
        // Immediately fetch fresh data
        fetchOrders();
      });

      newSocket.on('payment-updated', (paymentData) => {
        console.log('💳 Payment updated received:', paymentData);
        console.log('🔄 Auto-refreshing orders due to payment-updated event');
        // Immediately fetch fresh data
        fetchOrders();
      });

      // Listen for new order events
      newSocket.on('new-order-received', (orderData) => {
        console.log('🆕 New order received:', orderData);
        console.log('🔄 Auto-refreshing orders due to new-order-received event');
        // Immediately fetch fresh data
        fetchOrders();
      });

      // Listen for any WebSocket events for debugging
      newSocket.onAny((eventName, ...args) => {
        console.log('🔌 WebSocket event received:', eventName, args);
      });

      // Add connection status logging
      newSocket.on('connect', () => {
        console.log('🔌 Customer WebSocket connected');
        console.log('🔌 Socket ID:', newSocket.id);
        console.log('🔌 Customer email for room:', user.email);
      });

      newSocket.on('disconnect', () => {
        console.log('🔌 Customer WebSocket disconnected');
      });

      newSocket.on('connect_error', (error) => {
        console.error('🔌 WebSocket connection error:', error);
      });

      // Listen for test event to confirm room joining
      newSocket.on('test-customer-room', (data) => {
        console.log('✅ Customer room test event received:', data);
      });

      fetchOrders();

      // Set up periodic refresh as fallback (every 10 seconds)
      const refreshInterval = setInterval(() => {
        console.log('🔄 Periodic refresh triggered');
        fetchOrders();
      }, 10000);

      // Store interval for cleanup
      (newSocket as any).refreshInterval = refreshInterval;

      // Refresh when page becomes visible again
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          console.log('👁️ Page became visible, refreshing orders');
          fetchOrders();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      // Store handler for cleanup
      (newSocket as any).visibilityHandler = handleVisibilityChange;
    } else if (loading) {
      console.log('⏳ Still loading authentication...');
    } else {
      console.log('❓ Unexpected state - loading:', loading, 'authenticated:', authenticated, 'user:', user);
    }

    return () => {
      if (socket) {
        // Clear the refresh interval
        if ((socket as any).refreshInterval) {
          clearInterval((socket as any).refreshInterval);
        }
        // Remove visibility change listener
        if ((socket as any).visibilityHandler) {
          document.removeEventListener('visibilitychange', (socket as any).visibilityHandler);
        }
        socket.close();
      }
    };
  }, [loading, authenticated, user, navigate]);

  // Watch for order changes and update selected order automatically
  useEffect(() => {
    if (orders.length > 0) {
      const currentOrder = getCurrentOrder();
      if (currentOrder) {
        // Only update if the order actually changed
        if (!selectedOrder ||
            selectedOrder.order_id !== currentOrder.order_id ||
            selectedOrder.status !== currentOrder.status) {
          console.log('🔄 Auto-updating selected order with new data:', currentOrder);
          setSelectedOrder(currentOrder);
        }
      } else if (selectedOrder) {
        // No current order, clear selected order
        setSelectedOrder(null);
      }
    } else if (selectedOrder) {
      setSelectedOrder(null);
    }
    
    // Reset pagination when orders change
    setCurrentPage(1);
  }, [orders]);

  const fetchOrders = async () => {
    try {
      console.log('🔍 fetchOrders called');
      console.log('  - user:', user);
      console.log('  - user?.email:', user?.email);
      console.log('  - user?.name:', user?.name);
      
      if (!user || !user.email) {
        console.log('❌ No user or user email found');
        return;
      }
      
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const url = `${API_URL}/api/customer/orders/${user.email}`;
      console.log('  - API URL:', url);
      
      const response = await fetch(url, { credentials: 'include' });
      console.log('  - Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('  - API Response:', data);
        
        if (data.success) {
          const sortedOrders = (data.orders || []).sort((a: Order, b: Order) => 
            new Date(b.order_time).getTime() - new Date(a.order_time).getTime()
          );
          console.log('  - Sorted orders:', sortedOrders);
          console.log('  - Orders count:', sortedOrders.length);
          
          // If no orders found, try alternative approach
          if (sortedOrders.length === 0) {
            console.log('⚠️ No orders found via customer API, trying test endpoint...');
            // Try the test endpoint first
            try {
              const testResponse = await fetch(`${API_URL}/api/customer/test-orders/${user.email}`, { credentials: 'include' });
              if (testResponse.ok) {
                const testData = await testResponse.json();
                console.log('  - Test endpoint response:', testData);
                if (testData.success && testData.orders.length > 0) {
                  console.log('  - Test endpoint found orders:', testData.orders.length);
                  setOrders(testData.orders);
                  return;
                }
              }
            } catch (testError) {
              console.log('  - Test endpoint failed:', testError);
            }
            
            // Try fetching all orders and filtering client-side as fallback
            try {
              const altResponse = await fetch(`${API_URL}/api/orders`, { credentials: 'include' });
              if (altResponse.ok) {
                const altData = await altResponse.json();
                if (altData.success) {
                  const filteredOrders = (altData.orders || []).filter((order: any) => 
                    order.customer_name === user.name || 
                    order.customer_name === user.email ||
                    order.customer_name?.includes(user.email?.split('@')[0])
                  );
                  console.log('  - Alternative orders found:', filteredOrders.length);
                  if (filteredOrders.length > 0) {
                    setOrders(filteredOrders);
                    return;
                  }
                }
              }
            } catch (altError) {
              console.log('  - Alternative fetch failed:', altError);
            }
          }
          
          // Debug status values
          sortedOrders.forEach((order: Order, index: number) => {
            console.log(`🔍 CustomerOrders - Order ${index + 1} status:`, order.status, typeof order.status);
            console.log(`🔍 CustomerOrders - Order ${index + 1} payment_status:`, order.payment_status);
            console.log(`🔍 CustomerOrders - Order ${index + 1} payment_method:`, order.payment_method);
            console.log(`🔍 CustomerOrders - Order ${index + 1} table_number:`, order.table_number);
            console.log(`🔍 CustomerOrders - Order ${index + 1} order_time:`, order.order_time);
            console.log(`🔍 CustomerOrders - Order ${index + 1} isActive:`, isActiveStatus(order.status));
            console.log(`🔍 CustomerOrders - Order ${index + 1} isRecent:`, isRecentOrder(order.order_time));
          });
          
          setOrders(sortedOrders);
          
          // Only update selectedOrder when it actually changes
          const currentOrders = sortedOrders.filter((order: Order) => {
            const isActive = isActiveStatus(order.status);
            const isRecent = isRecentOrder(order.order_time);
            
            // Always show pending/pending_verification orders regardless of age
            if (order.status === 'pending' || order.status === 'pending_verification') {
              console.log(`✅ Order ${order.order_id} included (pending/pending_verification):`, order.status);
              return true;
            }
            
            // For other active statuses, only show if recent
            const shouldShow = isActive && isRecent;
            console.log(`🔍 Order ${order.order_id} filtering:`, {
              status: order.status,
              isActive,
              isRecent,
              shouldShow
            });
            return shouldShow;
          });
          const activeOrder = currentOrders.length > 0 ? currentOrders[0] : null;
          
          console.log(`🔍 Current orders found:`, currentOrders.length);
          console.log(`🔍 Active order selected:`, activeOrder);
          
          if (activeOrder) {
            if (!selectedOrder ||
                selectedOrder.order_id !== activeOrder.order_id ||
                selectedOrder.status !== activeOrder.status) {
              setSelectedOrder(activeOrder);
              console.log('  - Selected active order:', activeOrder);
            }
          } else if (selectedOrder) {
            setSelectedOrder(null);
            console.log('  - No active order found; selectedOrder cleared');
          }
        } else {
          console.error('Failed to fetch orders:', data.message);
        }
      } else {
        console.error('API call failed with status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const getProgressPercentage = (status: string) => {
    switch (status) {
      case 'completed':
        return 100;
      case 'ready':
        return 80;
      case 'preparing':
        return 50;
      case 'pending':
        return 20;
      default:
        return 0;
    }
  };

  // Pagination logic for completed orders
  const getPaginatedOrders = () => {
    const completedOrders = getCompletedOrders();
    if (showAll) {
      return completedOrders;
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return completedOrders.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    const completedOrders = getCompletedOrders();
    return Math.ceil(completedOrders.length / itemsPerPage);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1); // Reset to first page
  };

  const handleShowAllToggle = () => {
    setShowAll(!showAll);
    setCurrentPage(1); // Reset to first page
  };

  const handleOrderCardClick = (order: Order) => {
    setSelectedOrderForDetails(order);
    setShowOrderDetailsModal(true);
  };

  // Helper functions for order filtering
  const isActiveStatus = (s?: string) => {
    const status = s?.toString().toLowerCase();
    return (
      status === 'pending' ||
      status === 'pending_verification' ||
      status === 'confirmed' ||
      status === 'preparing' ||
      status === 'ready' ||
      status === 'processing'
    );
  };

  const isRecentOrder = (time?: string) => {
    if (!time) return false;
    const now = Date.now();
    const placed = new Date(time).getTime();
    return now - placed <= 24 * 60 * 60 * 1000; // 24 hours
  };

  // Separate current orders from completed orders
  const getCurrentOrders = () => {
    // Show all active orders, but prioritize recent ones
    return orders.filter(order => {
      const isActive = isActiveStatus(order.status);
      const isRecent = isRecentOrder(order.order_time);
      
      // Always show pending/pending_verification orders regardless of age
      if (order.status === 'pending' || order.status === 'pending_verification') {
        return true;
      }
      
      // For other active statuses, only show if recent
      return isActive && isRecent;
    });
  };

  const getCompletedOrders = () => {
    return orders.filter(order => 
      order.status === 'completed' || order.status === 'cancelled'
    );
  };

  const getCurrentOrder = () => {
    const currentOrders = getCurrentOrders();
    return currentOrders.length > 0 ? currentOrders[0] : null;
  };

  const formatOrderTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price: string | number) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return isNaN(numPrice) ? '0.00' : numPrice.toFixed(2);
  };

  if (loading || loadingOrders) {
    return (
      <div className="min-h-screen bg-[#f8eee4] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your orders...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="space-y-4 sm:space-y-6 mx-2 sm:mx-4 lg:mx-6 pt-4">
        {/* Header Section */}
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Orders</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Track your current order and view order history</p>
            </div>
          </div>
        </div>
        
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <Coffee className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Yet</h3>
            <p className="text-gray-600 mb-4">Start your coffee journey by placing your first order!</p>
            <button
              onClick={() => {
                const urlParams = new URLSearchParams(window.location.search);
                const tableFromUrl = urlParams.get('table');
                const menuUrl = tableFromUrl ? `/customer/menu?table=${tableFromUrl}` : '/customer/menu';
                navigate(menuUrl);
              }}
              className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700"
               title="Browse Menu"
            >
              Browse Menu
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {/* Left Column - Current Order Status */}
             <div className="space-y-4">
               <h2 className="text-2xl font-bold text-gray-900">Current Order Status</h2>
               
              {selectedOrder ? (
                 <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-gray-200 hover:shadow-2xl transition-shadow duration-300">
                   {/* Order Status Header */}
                   <div className="p-6 bg-amber-50">
                     <div className="flex items-center justify-between mb-6">
                       <div className="flex items-center">
                         <div className="p-3 rounded-full bg-amber-100">
                           <Utensils className="w-6 h-6 text-amber-600" />
                         </div>
                         <div className="ml-4">
                           <h3 className="text-xl font-bold text-gray-900">
                             {selectedOrder.status === 'completed' ? 'Order Completed' :
                              selectedOrder.status === 'ready' ? 'Ready for Pickup' :
                              selectedOrder.status === 'preparing' ? 'Preparing Your Order' :
                              'Order Confirmed'}
                           </h3>
                           <p className="text-sm text-gray-600">
                             {selectedOrder.status === 'completed' ? 'Your delicious order is ready!' :
                              selectedOrder.status === 'ready' ? 'Your order is ready for pickup!' :
                              selectedOrder.status === 'preparing' ? 'Your delicious order is being carefully prepared.' :
                              'We have received your order and will start preparing it soon.'}
                           </p>
                         </div>
                       </div>
                       <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                         (() => {
                           const status = selectedOrder.status?.toString().toLowerCase();
                           console.log('CustomerOrders status badge - raw status:', selectedOrder.status, 'normalized:', status);
                           
                          // Handle null/undefined status - default to VERIFYING color
                          if (!selectedOrder.status) {
                             return 'bg-amber-100 text-amber-800';
                           }
                           
                           if (status === 'completed') return 'bg-green-100 text-green-800';
                           if (status === 'ready') return 'bg-blue-100 text-blue-800';
                           if (status === 'preparing') return 'bg-yellow-100 text-yellow-800';
                           if (status === 'pending') return 'bg-orange-100 text-orange-800';
                           if (status === 'pending_verification') return 'bg-amber-100 text-amber-800';
                           if (status === 'confirmed') return 'bg-purple-100 text-purple-800';
                           if (status === 'cancelled') return 'bg-red-100 text-red-800';
                           if (status === 'processing') return 'bg-indigo-100 text-indigo-800';
                           console.warn('Unknown status for badge color:', status);
                           return 'bg-amber-100 text-amber-800'; // Default to VERIFYING color
                         })()
                       }`}>
                         {(() => {
                           const rawStatus = selectedOrder.status;
                           const status = rawStatus?.toString().toLowerCase();
                           console.log('🔍 CustomerOrders status badge - raw status:', rawStatus, 'type:', typeof rawStatus, 'normalized:', status);
                           
                           // Handle null/undefined status - default to VERIFYING
                           if (!rawStatus) {
                             console.error('❌ CustomerOrders - Invalid status detected:', rawStatus);
                             console.error('❌ CustomerOrders - Full selectedOrder:', selectedOrder);
                             return 'VERIFYING'; // Default to VERIFYING instead of ERROR
                           }
                           
                           if (status === 'completed') return 'COMPLETED';
                           if (status === 'ready') return 'READY';
                           if (status === 'preparing') return 'IN PROGRESS';
                           if (status === 'pending') return 'PENDING';
                           if (status === 'pending_verification') return 'VERIFYING';
                           if (status === 'confirmed') return 'CONFIRMED';
                           if (status === 'cancelled') return 'CANCELLED';
                           if (status === 'processing') return 'PROCESSING';
                           
                           console.warn('❌ CustomerOrders - Unknown status for badge text:', { rawStatus, status, type: typeof rawStatus });
                           return 'UNKNOWN';
                         })()}
                       </div>
                     </div>

                     {/* Order Details */}
                     <div className="grid grid-cols-2 gap-6 mb-6">
                       <div>
                         <p className="text-sm text-gray-600 mb-1">Order ID</p>
                         <p className="font-medium text-gray-900">{selectedOrder.order_id}</p>
                       </div>
                       <div>
                         <p className="text-sm text-gray-600 mb-1">Service Options</p>
                         <p className="font-medium text-gray-900 capitalize">{selectedOrder.order_type.replace('_', '-')}</p>
                       </div>
                       {selectedOrder.order_type === 'dine_in' && (
                         <div>
                           <p className="text-sm text-gray-600 mb-1">Table Number</p>
                           <p className="font-medium text-gray-900">{selectedOrder.table_number || 'Not specified'}</p>
                         </div>
                       )}
                       <div>
                         <p className="text-sm text-gray-600 mb-1">Order Time</p>
                         <p className="font-medium text-gray-900">{new Date(selectedOrder.order_time).toLocaleString('en-US', {
                           month: 'long',
                           day: 'numeric',
                           year: 'numeric',
                           hour: '2-digit',
                           minute: '2-digit'
                         })}</p>
                       </div>
                     </div>

                     {/* Progress Bar */}
                     <div className="mb-4">
                       <div className="w-full bg-gray-200 rounded-full h-2">
                         <ProgressBar 
                           value={getProgressPercentage(selectedOrder.status)}
                           variant="amber"
                         />
                       </div>
                       <p className="text-sm text-gray-600 mt-1">{getProgressPercentage(selectedOrder.status)}% Complete</p>
                     </div>
                   </div>

                   {/* Order Progress Steps */}
                   <div className="p-6 border-t border-gray-100">
                     <h4 className="text-lg font-bold text-gray-900 mb-4">Order Progress</h4>
                     <div className="space-y-4">
                       <div className="flex items-center">
                         <div className={`p-2 rounded-full ${
                           selectedOrder.status === 'completed' || selectedOrder.status === 'ready' || 
                           selectedOrder.status === 'preparing' || selectedOrder.status === 'pending' || selectedOrder.status === 'pending_verification' 
                           ? 'bg-amber-100' : 'bg-gray-100'
                         }`}>
                           <CheckCircle className={`w-5 h-5 ${
                             selectedOrder.status === 'completed' || selectedOrder.status === 'ready' || 
                             selectedOrder.status === 'preparing' || selectedOrder.status === 'pending' || selectedOrder.status === 'pending_verification' 
                             ? 'text-amber-600' : 'text-gray-400'
                           }`} />
                         </div>
                         <div className="ml-4">
                           <p className="font-bold text-gray-900">Order Confirmed</p>
                           <p className="text-sm text-gray-500">
                             {selectedOrder.status === 'completed' || selectedOrder.status === 'ready' || 
                              selectedOrder.status === 'preparing' || selectedOrder.status === 'pending' || selectedOrder.status === 'pending_verification' 
                              ? 'Confirmed' : 'Pending'}
                           </p>
                         </div>
                       </div>

                       <div className="flex items-center">
                         <div className={`p-2 rounded-full ${
                           selectedOrder.status === 'completed' || selectedOrder.status === 'ready' || 
                           selectedOrder.status === 'preparing' || selectedOrder.status === 'pending' || selectedOrder.status === 'pending_verification' 
                           ? 'bg-amber-100' : 'bg-gray-100'
                         }`}>
                           <Utensils className={`w-5 h-5 ${
                             selectedOrder.status === 'completed' || selectedOrder.status === 'ready' || 
                             selectedOrder.status === 'preparing' || selectedOrder.status === 'pending' || selectedOrder.status === 'pending_verification' 
                             ? 'text-amber-600' : 'text-gray-400'
                           }`} />
                         </div>
                         <div className="ml-4">
                           <p className="font-bold text-gray-900">Preparing Your Order</p>
                           <p className="text-sm text-gray-500">
                             {selectedOrder.status === 'completed' || selectedOrder.status === 'ready' 
                              ? 'Completed' : 
                              selectedOrder.status === 'preparing' 
                              ? 'In Progress....' : 
                              selectedOrder.status === 'pending' || selectedOrder.status === 'pending_verification' 
                              ? 'Confirmed' : 'Pending'}
                           </p>
                         </div>
                       </div>

                       <div className="flex items-center">
                         <div className={`p-2 rounded-full ${
                           selectedOrder.status === 'completed' || selectedOrder.status === 'ready' 
                           ? 'bg-amber-100' : 'bg-gray-100'
                         }`}>
                           <Bell className={`w-5 h-5 ${
                             selectedOrder.status === 'completed' || selectedOrder.status === 'ready' 
                             ? 'text-amber-600' : 'text-gray-400'
                           }`} />
                         </div>
                         <div className="ml-4">
                           <p className="font-bold text-gray-900">Ready</p>
                           <p className="text-sm text-gray-500">
                             {selectedOrder.status === 'completed' 
                              ? 'Completed' : 
                              selectedOrder.status === 'ready' 
                              ? 'Ready!' : 'To serve'}
                           </p>
                         </div>
                       </div>
                     </div>
                   </div>

                   {/* Ordered Items */}
                   <div className="p-6 border-t border-gray-100">
                     <h4 className="text-lg font-bold text-gray-900 mb-4">Ordered Items</h4>
                     <div className="space-y-3">
                       {selectedOrder.items.map((item, index) => (
                         <div key={index} className="flex justify-between items-center">
                           <div className="flex-1">
                             <p className="text-gray-900">{item.quantity} x {item.name}</p>
                             {item.customizations && (
                               <p className="text-sm text-gray-500">
                                 {Object.entries(item.customizations).map(([key, value]) => 
                                   `${key}: ${value}`
                                 ).join(', ')}
                               </p>
                             )}
                           </div>
                           <p className="font-bold text-amber-600">₱{(item.price * item.quantity).toFixed(2)}</p>
                         </div>
                       ))}
                     </div>
                   </div>

                   {/* Payment Information */}
                   <div className="p-6 border-t border-gray-100">
                     <h4 className="text-lg font-bold text-gray-900 mb-4">Payment Information</h4>
                     <div className="grid grid-cols-2 gap-4 mb-4">
                       <div>
                         <p className="text-sm text-gray-600 mb-1">Payment Method</p>
                         <p className="font-medium text-gray-900 capitalize">{selectedOrder.payment_method || 'Not specified'}</p>
                       </div>
                       <div>
                         <p className="text-sm text-gray-600 mb-1">Payment Status</p>
                         <p className={`font-medium ${
                           selectedOrder.payment_status === 'paid' ? 'text-green-600' :
                           selectedOrder.payment_status === 'failed' ? 'text-red-600' :
                           'text-amber-600'
                         }`}>
                           {selectedOrder.payment_status === 'paid' ? 'Paid' :
                            selectedOrder.payment_status === 'failed' ? 'Failed' :
                            'Pending'}
                         </p>
                       </div>
                     </div>
                     
                     {/* Receipt Upload for Digital Payments */}
                     {selectedOrder.payment_status === 'pending' && (selectedOrder.payment_method === 'gcash' || selectedOrder.payment_method === 'paymaya') && (
                       <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                         <h5 className="font-medium text-blue-900 mb-2">Upload Payment Receipt</h5>
                         <p className="text-sm text-blue-700 mb-3">
                           Please scan the QR code with your {selectedOrder.payment_method?.toUpperCase()} app, complete the payment, and upload the receipt screenshot below.
                         </p>
                         <div className="space-y-3">
                           <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">
                               Receipt Screenshot
                             </label>
                             <input
                               type="file"
                               accept="image/*"
                               aria-label="Upload payment receipt"
                               onChange={async (e) => {
                                 const file = e.target.files?.[0];
                                 if (!file) return;
                                 
                                 try {
                                   const formData = new FormData();
                                   formData.append('receipt', file);
                                   formData.append('orderId', selectedOrder.order_id);
                                   
                                   const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/receipts/upload-receipt`, {
                                     method: 'POST',
                                     credentials: 'include',
                                     body: formData,
                                   });
                                   
                                   const result = await response.json();
                                   
                                   if (result.success) {
                                     alert('Receipt uploaded successfully! Your payment is being verified.');
                                     // Refresh orders to update status
                                     fetchOrders();
                                   } else {
                                     alert(`Failed to upload receipt: ${result.message}`);
                                   }
                                 } catch (error) {
                                   console.error('Receipt upload error:', error);
                                   alert('Failed to upload receipt. Please try again.');
                                 }
                               }}
                               className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                             />
                           </div>
                           <div className="text-xs text-blue-600">
                             Supported formats: JPG, PNG, GIF (Max 5MB)
                           </div>
                         </div>
                       </div>
                     )}
                   </div>

                   {/* Total Amount */}
                   <div className="p-6 border-t border-gray-100 bg-gray-50">
                     <h4 className="text-lg font-bold text-gray-900 mb-2">Total Amount</h4>
                     <p className="text-2xl font-bold text-amber-600">₱{formatPrice(selectedOrder.total_price)}</p>
                   </div>
                 </div>
               ) : (
                 <div className="text-center py-12">
                   <Coffee className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                   <h3 className="text-lg font-medium text-gray-900 mb-2">No current order</h3>
                   <p className="text-gray-600 mb-6">You don't have any active orders at the moment.</p>
                   <div className="space-y-3">
                     <button
                       onClick={() => {
                         const urlParams = new URLSearchParams(window.location.search);
                         const tableFromUrl = urlParams.get('table');
                         const menuUrl = tableFromUrl ? `/customer/menu?table=${tableFromUrl}` : '/customer/menu';
                         navigate(menuUrl);
                       }}
                       className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition-colors"
                     >
                       Browse Menu
                     </button>
                     
                     {/* Debug button */}
                     <button
                       onClick={() => {
                         console.log('🔍 Manual refresh triggered');
                         fetchOrders();
                       }}
                       className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                     >
                       Debug: Refresh Orders
                     </button>
                   </div>
                 </div>
               )}
             </div>

             {/* Right Column - Order History */}
             <div className="space-y-4">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <h2 className="text-2xl font-bold text-gray-900">Order History</h2>
                 
                 {/* Pagination Controls */}
                 <div className="flex flex-col sm:flex-row items-center gap-3">
                   {/* Items per page selector */}
                   {!showAll && (
                     <div className="flex items-center gap-2">
                       <label className="text-sm text-gray-600">Show:</label>
                       <select
                         value={itemsPerPage}
                         onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                         className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                         aria-label="Items per page"
                       >
                         <option value={5}>5</option>
                         <option value={10}>10</option>
                         <option value={20}>20</option>
                       </select>
                       <span className="text-sm text-gray-600">per page</span>
                     </div>
                   )}
                   
                   {/* Show all toggle */}
                   <button
                     onClick={handleShowAllToggle}
                     className={`px-3 py-1 text-sm rounded-md transition-colors ${
                       showAll 
                         ? 'bg-amber-600 text-white hover:bg-amber-700' 
                         : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                     }`}
                   >
                     {showAll ? 'Show Paginated' : 'Show All'}
                   </button>
                 </div>
               </div>
               
               <div className="space-y-4">
                 {getPaginatedOrders().map((order) => (
                   <div 
                     key={order.id} 
                     className="bg-white rounded-2xl shadow-xl p-6 cursor-pointer transition-all duration-200 hover:shadow-2xl border-2 border-transparent hover:border-amber-200"
                     onClick={() => handleOrderCardClick(order)}
                   >
                     {/* Order Header */}
                     <div className="flex items-center justify-between mb-4">
                       <div className="flex items-center space-x-4">
                         <div className="p-3 rounded-full bg-amber-100">
                           <Utensils className="w-6 h-6 text-amber-600" />
                         </div>
                         <div>
                           <p className="font-bold text-gray-900">Order ID: {order.order_id}</p>
                           <div className="flex items-center space-x-4 mt-1">
                             <div className="flex items-center text-sm text-gray-600">
                               <Calendar className="w-4 h-4 mr-1" />
                               <span>{new Date(order.order_time).toLocaleDateString('en-US', {
                                 month: 'long',
                                 day: 'numeric',
                                 year: 'numeric'
                               })}</span>
                             </div>
                             <div className="flex items-center text-sm text-gray-600">
                               <Clock className="w-4 h-4 mr-1" />
                               <span>{formatOrderTime(order.order_time)}</span>
                             </div>
                           </div>
                         </div>
                       </div>
                       <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold min-w-[80px] justify-center ${
                         (() => {
                           const status = order.status?.toString().toLowerCase();
                           
                           if (status === 'completed') return 'bg-green-100 text-green-800';
                           if (status === 'ready') return 'bg-blue-100 text-blue-800';
                           if (status === 'preparing') return 'bg-yellow-100 text-yellow-800';
                           if (status === 'pending') return 'bg-orange-100 text-orange-800';
                           if (status === 'pending_verification') return 'bg-orange-100 text-orange-800';
                           if (status === 'cancelled') return 'bg-red-100 text-red-800';
                           if (status === 'confirmed') return 'bg-purple-100 text-purple-800';
                           if (status === 'processing') return 'bg-indigo-100 text-indigo-800';
                           
                           return 'bg-gray-100 text-gray-800';
                         })()
                       }`}>
                         {(() => {
                           const status = order.status?.toString().toLowerCase();
                           
                           if (status === 'completed') return 'COMPLETED';
                           if (status === 'ready') return 'READY';
                           if (status === 'preparing') return 'PREPARING';
                           if (status === 'pending') return 'PENDING';
                           if (status === 'pending_verification') return 'PENDING';
                           if (status === 'cancelled') return 'CANCELLED';
                           if (status === 'confirmed') return 'CONFIRMED';
                           if (status === 'processing') return 'PROCESSING';
                           
                           return 'UNKNOWN';
                         })()}
                       </div>
                     </div>

                     {/* Order Items */}
                     <div className="mb-4">
                       {order.items.map((item, index) => (
                         <div key={index} className="flex justify-between items-center py-1">
                           <div className="flex-1">
                             <p className="text-gray-900">{item.quantity} x {item.name}</p>
                             {item.customizations && (
                               <p className="text-sm text-gray-500">
                                 {Object.entries(item.customizations).map(([key, value]) => 
                                   `${key}: ${value}`
                                 ).join(', ')}
                               </p>
                             )}
                           </div>
                           <p className="font-bold text-amber-600">₱{(item.price * item.quantity).toFixed(2)}</p>
                         </div>
                       ))}
                     </div>

                     {/* Order Details */}
                     <div className="border-t border-gray-100 pt-4">
                       <div className="flex justify-between items-center mb-2">
                         <span className="text-sm text-gray-600">Service Option</span>
                         <span className="text-sm font-medium text-gray-900 capitalize">{order.order_type.replace('_', '-')}</span>
                       </div>
                       <div className="flex justify-between items-center">
                         <span className="text-sm text-gray-600">Total Amount</span>
                         <span className="text-lg font-bold text-amber-600">₱{formatPrice(order.total_price)}</span>
                       </div>
                     </div>
                   </div>
                 ))}
               </div>

               {/* Pagination Controls */}
               {!showAll && getCompletedOrders().length > itemsPerPage && (
                 <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-gray-200">
                   {/* Page info */}
                   <div className="text-sm text-gray-600">
                     Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, getCompletedOrders().length)} of {getCompletedOrders().length} orders
                   </div>
                   
                   {/* Page navigation */}
                   <div className="flex items-center gap-2">
                     <button
                       onClick={() => handlePageChange(currentPage - 1)}
                       disabled={currentPage === 1}
                       className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                       Previous
                     </button>
                     
                     {/* Page numbers */}
                     <div className="flex items-center gap-1">
                       {Array.from({ length: getTotalPages() }, (_, i) => i + 1).map((page) => (
                         <button
                           key={page}
                           onClick={() => handlePageChange(page)}
                           className={`px-3 py-1 text-sm rounded-md ${
                             currentPage === page
                               ? 'bg-amber-600 text-white'
                               : 'border border-gray-300 hover:bg-gray-50'
                           }`}
                         >
                           {page}
                         </button>
                       ))}
                     </div>
                     
                     <button
                       onClick={() => handlePageChange(currentPage + 1)}
                       disabled={currentPage === getTotalPages()}
                       className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                       Next
                     </button>
                   </div>
                 </div>
               )}

               {/* Show all info */}
               {showAll && (
                 <div className="text-sm text-gray-600 mt-4 pt-4 border-t border-gray-200 text-center">
                   Showing all {getCompletedOrders().length} orders
                 </div>
               )}
             </div>
           </div>
        )}
      </div>

      {/* Order History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Order History</h2>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close order history modal"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Pagination Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  {/* Items per page selector */}
                  {!showAll && (
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">Show:</label>
                      <select
                        title="Items per page"
                        value={itemsPerPage}
                        onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                        className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                      </select>
                      <span className="text-sm text-gray-600">per page</span>
                    </div>
                  )}
                  
                  {/* Show all toggle */}
                  <button
                    onClick={handleShowAllToggle}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      showAll 
                        ? 'bg-amber-600 text-white hover:bg-amber-700' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {showAll ? 'Show Paginated' : 'Show All'}
                  </button>
                </div>
              </div>
              
              {/* Orders List */}
              <div className="space-y-4">
                {getPaginatedOrders().length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No order history</h3>
                    <p className="text-gray-600">Your completed orders will appear here.</p>
                  </div>
                ) : (
                  getPaginatedOrders().map((order) => (
                    <div 
                      key={order.id} 
                      className="bg-gray-50 rounded-2xl p-6 hover:shadow-lg transition-all duration-200 border border-gray-200"
                    >
                      {/* Order Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div className="p-3 rounded-full bg-amber-100">
                            <Utensils className="w-6 h-6 text-amber-600" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">Order ID: {order.order_id}</p>
                            <div className="flex items-center space-x-4 mt-1">
                              <div className="flex items-center text-sm text-gray-600">
                                <Calendar className="w-4 h-4 mr-1" />
                                <span>{new Date(order.order_time).toLocaleDateString('en-US', {
                                  month: 'long',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}</span>
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <Clock className="w-4 h-4 mr-1" />
                                <span>{formatOrderTime(order.order_time)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold min-w-[80px] justify-center ${
                          (() => {
                            const status = order.status?.toString().toLowerCase();
                            
                            if (status === 'completed') return 'bg-green-100 text-green-800';
                            if (status === 'ready') return 'bg-blue-100 text-blue-800';
                            if (status === 'preparing') return 'bg-yellow-100 text-yellow-800';
                            if (status === 'pending') return 'bg-orange-100 text-orange-800';
                            if (status === 'pending_verification') return 'bg-orange-100 text-orange-800';
                            if (status === 'cancelled') return 'bg-red-100 text-red-800';
                            if (status === 'confirmed') return 'bg-purple-100 text-purple-800';
                            if (status === 'processing') return 'bg-indigo-100 text-indigo-800';
                            
                            return 'bg-gray-100 text-gray-800';
                          })()
                        }`}>
                          {(() => {
                            const status = order.status?.toString().toLowerCase();
                            
                            if (status === 'completed') return 'COMPLETED';
                            if (status === 'ready') return 'READY';
                            if (status === 'preparing') return 'PREPARING';
                            if (status === 'pending') return 'PENDING';
                            if (status === 'pending_verification') return 'PENDING';
                            if (status === 'cancelled') return 'CANCELLED';
                            if (status === 'confirmed') return 'CONFIRMED';
                            if (status === 'processing') return 'PROCESSING';
                            
                            return 'UNKNOWN';
                          })()}
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="mb-4">
                        {order.items.map((item, index) => (
                          <div key={index} className="flex justify-between items-center py-1">
                            <div className="flex-1">
                              <p className="text-gray-900">{item.quantity} x {item.name}</p>
                              {item.customizations && (
                                <p className="text-sm text-gray-500">
                                  {Object.entries(item.customizations).map(([key, value]) => 
                                    `${key}: ${value}`
                                  ).join(', ')}
                                </p>
                              )}
                            </div>
                            <p className="font-bold text-amber-600">₱{(item.price * item.quantity).toFixed(2)}</p>
                          </div>
                        ))}
                      </div>

                      {/* Order Details */}
                      <div className="border-t border-gray-200 pt-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-600">Service Option</span>
                          <span className="text-sm font-medium text-gray-900 capitalize">{order.order_type.replace('_', '-')}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Total Amount</span>
                          <span className="text-lg font-bold text-amber-600">₱{formatPrice(order.total_price)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination Controls */}
              {!showAll && getCompletedOrders().length > itemsPerPage && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-gray-200">
                  {/* Page info */}
                  <div className="text-sm text-gray-600">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, getCompletedOrders().length)} of {getCompletedOrders().length} orders
                  </div>
                  
                  {/* Page navigation */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    
                    {/* Page numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: getTotalPages() }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-3 py-1 text-sm rounded-md ${
                            currentPage === page
                              ? 'bg-amber-600 text-white'
                              : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === getTotalPages()}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              {/* Show all info */}
              {showAll && (
                <div className="text-sm text-gray-600 mt-4 pt-4 border-t border-gray-200 text-center">
                  Showing all {getCompletedOrders().length} orders
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {showOrderDetailsModal && selectedOrderForDetails && (
        <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Order Details</h2>
              <button
                title="Close order details"
                onClick={() => setShowOrderDetailsModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Order Status Card */}
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-full bg-amber-100">
                      <Utensils className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {selectedOrderForDetails.status === 'completed' ? 'Order Completed' :
                         selectedOrderForDetails.status === 'ready' ? 'Order Ready' :
                         selectedOrderForDetails.status === 'preparing' ? 'Order in Progress' :
                         selectedOrderForDetails.status === 'pending' ? 'Order Confirmed' :
                         'Order Status'}
                      </h3>
                      <p className="text-gray-600">
                        {selectedOrderForDetails.status === 'completed' ? 'Your delicious order is ready!' :
                         selectedOrderForDetails.status === 'ready' ? 'Your order is ready for pickup!' :
                         selectedOrderForDetails.status === 'preparing' ? 'Your delicious order is being carefully prepared.' :
                         'We have received your order and will start preparing it soon.'}
                      </p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-bold min-w-[80px] justify-center ${
                    (() => {
                      const status = selectedOrderForDetails.status?.toString().toLowerCase();
                      
                      if (status === 'completed') return 'bg-green-100 text-green-800';
                      if (status === 'ready') return 'bg-blue-100 text-blue-800';
                      if (status === 'preparing') return 'bg-yellow-100 text-yellow-800';
                      if (status === 'pending') return 'bg-orange-100 text-orange-800';
                      if (status === 'pending_verification') return 'bg-orange-100 text-orange-800';
                      if (status === 'cancelled') return 'bg-red-100 text-red-800';
                      if (status === 'confirmed') return 'bg-purple-100 text-purple-800';
                      if (status === 'processing') return 'bg-indigo-100 text-indigo-800';
                      
                      return 'bg-gray-100 text-gray-800';
                    })()
                  }`}>
                    {(() => {
                      const status = selectedOrderForDetails.status?.toString().toLowerCase();
                      
                      if (status === 'completed') return 'COMPLETED';
                      if (status === 'ready') return 'READY';
                      if (status === 'preparing') return 'PREPARING';
                      if (status === 'pending') return 'PENDING';
                      if (status === 'pending_verification') return 'PENDING';
                      if (status === 'cancelled') return 'CANCELLED';
                      if (status === 'confirmed') return 'CONFIRMED';
                      if (status === 'processing') return 'PROCESSING';
                      
                      return 'UNKNOWN';
                    })()}
                  </div>
                </div>
                
                {/* Order Details */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Order ID</p>
                    <p className="font-bold text-gray-900">{selectedOrderForDetails.order_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Service Options</p>
                    <p className="font-bold text-gray-900 capitalize">{selectedOrderForDetails.order_type.replace('_', '-')}</p>
                  </div>
                  {selectedOrderForDetails.table_number && (
                    <div>
                      <p className="text-sm text-gray-600">Table Number</p>
                      <p className="font-bold text-gray-900">{selectedOrderForDetails.table_number}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Order Time</p>
                    <p className="font-bold text-gray-900">
                      {new Date(selectedOrderForDetails.order_time).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })} at {formatOrderTime(selectedOrderForDetails.order_time)}
                    </p>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mb-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <ProgressBar 
                      value={getProgressPercentage(selectedOrderForDetails.status)}
                      variant="gradient"
                      aria-label="Order progress"
                      title="Order progress"
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{getProgressPercentage(selectedOrderForDetails.status)}% Complete</p>
                </div>
              </div>

              {/* Order Progress Steps */}
              <div className="p-6 border-t border-gray-100">
                <h4 className="text-lg font-bold text-gray-900 mb-4">Order Progress</h4>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-full ${
                      selectedOrderForDetails.status === 'completed' || selectedOrderForDetails.status === 'ready' || 
                      selectedOrderForDetails.status === 'preparing' || selectedOrderForDetails.status === 'pending' || selectedOrderForDetails.status === 'pending_verification' 
                      ? 'bg-amber-100' : 'bg-gray-100'
                    }`}>
                      <CheckCircle className={`w-5 h-5 ${
                        selectedOrderForDetails.status === 'completed' || selectedOrderForDetails.status === 'ready' || 
                        selectedOrderForDetails.status === 'preparing' || selectedOrderForDetails.status === 'pending' || selectedOrderForDetails.status === 'pending_verification' 
                        ? 'text-amber-600' : 'text-gray-400'
                      }`} />
                    </div>
                    <div className="ml-4">
                      <p className="font-bold text-gray-900">Order Confirmed</p>
                      <p className="text-sm text-gray-500">
                        {selectedOrderForDetails.status === 'completed' || selectedOrderForDetails.status === 'ready' || 
                         selectedOrderForDetails.status === 'preparing' || selectedOrderForDetails.status === 'pending' || selectedOrderForDetails.status === 'pending_verification' 
                          ? 'Confirmed' : 'Pending'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className={`p-2 rounded-full ${
                      selectedOrderForDetails.status === 'completed' || selectedOrderForDetails.status === 'ready' || 
                      selectedOrderForDetails.status === 'preparing' || selectedOrderForDetails.status === 'pending' || selectedOrderForDetails.status === 'pending_verification' 
                      ? 'bg-amber-100' : 'bg-gray-100'
                    }`}>
                      <Utensils className={`w-5 h-5 ${
                        selectedOrderForDetails.status === 'completed' || selectedOrderForDetails.status === 'ready' || 
                        selectedOrderForDetails.status === 'preparing' || selectedOrderForDetails.status === 'pending' || selectedOrderForDetails.status === 'pending_verification' 
                        ? 'text-amber-600' : 'text-gray-400'
                      }`} />
                    </div>
                    <div className="ml-4">
                      <p className="font-bold text-gray-900">Preparing Your Order</p>
                      <p className="text-sm text-gray-500">
                        {selectedOrderForDetails.status === 'completed' || selectedOrderForDetails.status === 'ready' 
                          ? 'Completed' : 
                          selectedOrderForDetails.status === 'preparing' 
                          ? 'In Progress....' : 
                          selectedOrderForDetails.status === 'pending' || selectedOrderForDetails.status === 'pending_verification' 
                          ? 'Confirmed' : 'Pending'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className={`p-2 rounded-full ${
                      selectedOrderForDetails.status === 'completed' || selectedOrderForDetails.status === 'ready' 
                      ? 'bg-amber-100' : 'bg-gray-100'
                    }`}>
                      <Bell className={`w-5 h-5 ${
                        selectedOrderForDetails.status === 'completed' || selectedOrderForDetails.status === 'ready' 
                        ? 'text-amber-600' : 'text-gray-400'
                      }`} />
                    </div>
                    <div className="ml-4">
                      <p className="font-bold text-gray-900">Ready</p>
                      <p className="text-sm text-gray-500">
                        {selectedOrderForDetails.status === 'completed' || selectedOrderForDetails.status === 'ready' 
                          ? 'Completed' : 'To serve'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ordered Items */}
              <div className="p-6 border-t border-gray-100">
                <h4 className="text-lg font-bold text-gray-900 mb-4">Ordered Items</h4>
                <div className="space-y-2">
                  {selectedOrderForDetails.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.quantity} x {item.name}</p>
                        {item.customizations && (
                          <p className="text-sm text-gray-500">
                            {Object.entries(item.customizations).map(([key, value]) => 
                              `${key}: ${value}`
                            ).join(', ')}
                          </p>
                        )}
                      </div>
                      <p className="font-bold text-amber-600">₱{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Amount */}
              <div className="p-6 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">Total Amount</span>
                  <span className="text-2xl font-bold text-amber-600">₱{formatPrice(selectedOrderForDetails.total_price)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerOrders; 