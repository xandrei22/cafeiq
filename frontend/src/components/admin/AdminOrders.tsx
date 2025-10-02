import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';
import { 
  Coffee, 
  Clock, 
  CheckCircle, 
  Package, 
  DollarSign,
  Search,
  RefreshCw,
  X
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';

interface Order {
  orderId: string;
  customerName: string;
  tableNumber?: number;
  items: any[];
  totalPrice: number;
  status: 'pending' | 'pending_verification' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'pending_verification';
  orderType: 'dine_in' | 'takeout';
  queuePosition: number;
  estimatedReadyTime: string;
  orderTime: string;
  paymentMethod: string;
  notes?: string;
}

const AdminOrders: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [paymentSuccessData, setPaymentSuccessData] = useState<{orderId: string, amount: number, change: number} | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('preparing');
  const socketRef = useRef<Socket | null>(null);

  // Global error handler to suppress browser extension errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.message && event.message.includes('disconnected port object')) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && event.reason.message && event.reason.message.includes('disconnected port object')) {
        event.preventDefault();
        return false;
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  useEffect(() => {
    fetchOrders();
    // Removed periodic polling to avoid UI flicker from repeated loading states
    return () => {};
  }, []);

  // Debug modal states
  useEffect(() => {
    console.log('Modal states changed:', { showSuccessModal, showPaymentModal, paymentSuccessData: !!paymentSuccessData });
  }, [showSuccessModal, showPaymentModal, paymentSuccessData]);

  // Setup Socket.IO for real-time background updates (no flicker)
  useEffect(() => {
    let socket: Socket | null = null;
    let isMounted = true;

    const initializeSocket = () => {
      try {
        socket = io(API_URL, {
          transports: ['websocket', 'polling'],
          timeout: 30000,
          forceNew: true,
          autoConnect: true,
          withCredentials: true
        });
        socketRef.current = socket;

        const silentRefetch = async () => {
          if (!isMounted) return;
          try {
            const response = await fetch(`/api/orders`, { credentials: 'include' });
            if (response.ok) {
              const data = await response.json();
              if (data.success && isMounted) {
                const transformed = (data.orders || []).map((order: any) => {
                  const itemsArray = Array.isArray(order.items)
                    ? order.items
                    : (typeof order.items === 'string' ? JSON.parse(order.items || '[]') : []);
                  const rawStatus = (order.status || '').toLowerCase();
                  const normalizedStatus = rawStatus === 'processing' ? 'preparing'
                                            : rawStatus === 'pending_verification' ? 'pending'
                                            : rawStatus === 'confirmed' ? 'pending'
                                            : rawStatus;
                  return {
                    orderId: order.order_id || order.id,
                    customerName: order.customer_name,
                    tableNumber: order.table_number,
                    items: itemsArray,
                    totalPrice: order.total_price,
                    status: normalizedStatus,
                    paymentStatus: order.payment_status,
                    orderType: order.order_type,
                    queuePosition: 0,
                    estimatedReadyTime: order.estimated_ready_time,
                    orderTime: order.order_time,
                    paymentMethod: order.payment_method
                  };
                });
                setOrders(transformed);
              }
            }
          } catch (error) {
            console.warn('Silent refetch error:', error);
          }
        };

        socket.on('connect', () => {
          if (isMounted && socket) {
            socket.emit('join-admin-room');
          }
        });

        socket.on('disconnect', () => {
          console.log('Socket disconnected');
        });

        socket.on('error', (error) => {
          console.warn('Socket error:', error);
        });

        // When any order is created/updated/paid, refresh silently
        socket.on('new-order-received', silentRefetch);
        socket.on('order-updated', silentRefetch);
        socket.on('payment-updated', silentRefetch);
        socket.on('inventory-updated', silentRefetch);

      } catch (error) {
        console.error('Socket initialization error:', error);
      }
    };

    initializeSocket();

    return () => {
      isMounted = false;
      if (socket) {
        try {
          socket.removeAllListeners();
          socket.disconnect();
        } catch (error) {
          console.warn('Socket cleanup error:', error);
        }
      }
      socketRef.current = null;
    };
  }, [API_URL]);

  const fetchOrders = async (options: { silent?: boolean } = {}) => {
    const { silent = false } = options;
    try {
      if (!silent) setLoading(true);
      // Use generic orders endpoint (works for admin session)
      const response = await fetch(`/api/orders`, { credentials: 'include' });
      const data = response.ok ? await response.json() : null;

      if (data && data.success) {
        const transformedOrders: Order[] = (data.orders || []).map((order: any) => {
          const rawStatus = (order.status || '').toLowerCase();
          // Keep all statuses as-is for proper filtering
          const normalizedStatus = rawStatus === 'processing' ? 'preparing' : rawStatus;

          const itemsArray = Array.isArray(order.items)
            ? order.items
            : (typeof order.items === 'string' ? JSON.parse(order.items || '[]') : []);

          const orderId = order.orderId || order.order_id || order.id;
          
          // Debug logging for order ID and status
          if (!orderId || orderId === '0' || orderId === 0) {
            console.warn('Invalid order ID detected:', {
              order: order,
              orderId: orderId,
              orderIdSource: order.orderId ? 'orderId' : order.order_id ? 'order_id' : 'id'
            });
          }
          
          // Debug logging for order status
          console.log('Order status debug:', {
            orderId: orderId,
            originalStatus: order.status,
            normalizedStatus: normalizedStatus,
            paymentMethod: order.payment_method || order.paymentMethod,
            customerName: order.customer_name || order.customerName,
            fullOrder: order
          });

          return {
            orderId: orderId,
            customerName: order.customerName || order.customer_name,
            tableNumber: order.tableNumber || order.table_number,
            items: itemsArray,
            totalPrice: order.totalPrice || order.total_price,
            status: normalizedStatus as any,
            paymentStatus: order.paymentStatus || order.payment_status,
            orderType: order.orderType || order.order_type,
            queuePosition: order.queuePosition || 0,
            estimatedReadyTime: order.estimatedReadyTime || order.estimated_ready_time,
            orderTime: order.orderTime || order.order_time,
            paymentMethod: order.paymentMethod || order.payment_method,
            notes: order.notes
          };
        });
        setOrders(transformedOrders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      // Use generic orders endpoint that accepts admin session
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        if (status === 'completed' || status === 'cancelled') {
          setOrders(prev => prev.filter(o => o.orderId !== orderId));
        } else {
          fetchOrders({ silent: true });
        }
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const verifyPayment = async (orderId: string, paymentMethod: string) => {
    try {
      const response = await fetch(`${API_URL}/api/orders/${orderId}/verify-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          verifiedBy: 'admin', 
          paymentMethod 
        }),
      });

      if (response.ok) {
        console.log('Payment verification successful');
        // Close payment modal first
        setShowPaymentModal(false);
        
        // Get order details for success modal
        const order = orders.find(o => o.orderId === orderId);
        console.log('Found order for success modal:', order);
        if (order) {
          setPaymentSuccessData({
            orderId: order.orderId,
            amount: order.totalPrice,
            change: 0 // For admin verification, no change needed
          });
          
          // Show success modal after a short delay to ensure smooth transition
          setTimeout(() => {
            console.log('Showing success modal');
            setShowSuccessModal(true);
          }, 300);
        } else {
          console.warn('Order not found for success modal');
        }
        
        // Temporarily disable Socket.IO updates to prevent race condition
        if (socketRef.current) {
          socketRef.current.off('order-updated');
          socketRef.current.off('payment-updated');
        }
        
        // Refresh orders after a longer delay to ensure backend has processed and user sees success modal
        setTimeout(() => {
          fetchOrders({ silent: true });
          
          // Re-enable Socket.IO updates after refresh
          if (socketRef.current) {
            const silentRefetch = async () => {
              try {
                const response = await fetch(`/api/orders`, { credentials: 'include' });
                if (response.ok) {
                  const data = await response.json();
                  if (data.success) {
                    const transformed = (data.orders || []).map((order: any) => {
                      const itemsArray = Array.isArray(order.items)
                        ? order.items
                        : (typeof order.items === 'string' ? JSON.parse(order.items || '[]') : []);
                      const rawStatus = (order.status || '').toLowerCase();
                      // Keep all statuses as-is for proper filtering
                      const normalizedStatus = rawStatus === 'processing' ? 'preparing' : rawStatus;
                      return {
                        orderId: order.order_id || order.id,
                        customerName: order.customer_name,
                        tableNumber: order.table_number,
                        items: itemsArray,
                        totalPrice: order.total_price,
                        status: normalizedStatus,
                        paymentStatus: order.payment_status,
                        orderType: order.order_type,
                        queuePosition: 0,
                        estimatedReadyTime: order.estimated_ready_time,
                        orderTime: order.order_time,
                        paymentMethod: order.payment_method
                      };
                    });
                    setOrders(transformed);
                  }
                }
              } catch {}
            };
            socketRef.current.on('order-updated', silentRefetch);
            socketRef.current.on('payment-updated', silentRefetch);
          }
        }, 5000);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to verify payment');
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      toast.error('Failed to verify payment');
    }
  };

  // Filter orders based on search and filters
  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.orderId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesType = orderTypeFilter === 'all' || order.orderType === orderTypeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const preparingStatuses = ['preparing', 'processing'];
  const readyStatuses = ['ready'];

  const preparingOrders = filteredOrders.filter(order => {
    const isPreparing = preparingStatuses.includes(String(order.status));
    console.log('Preparing filter check:', { orderId: order.orderId, status: order.status, isPreparing, preparingStatuses });
    return isPreparing;
  });
  const readyOrders = filteredOrders.filter(order => {
    const isReady = readyStatuses.includes(String(order.status));
    console.log('Ready filter check:', { orderId: order.orderId, status: order.status, isReady, readyStatuses });
    return isReady;
  });

  const getStatusColor = (status: string) => {
    console.log('getStatusColor called with status:', status, 'type:', typeof status);
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending_verification':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'confirmed':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'preparing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ready':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        console.warn('Unknown status in getStatusColor:', status);
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'pending_verification':
        return <DollarSign className="w-4 h-4" />;
      case 'confirmed':
        return <CheckCircle className="w-4 h-4" />;
      case 'preparing':
        return <Coffee className="w-4 h-4" />;
      case 'ready':
        return <Package className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 sm:space-y-6 mx-2 sm:mx-4 lg:mx-6 p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Monitor and manage customer orders in real-time</p>
        </div>
        <div className="flex items-center gap-3" />
      </div>

      {/* Order Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

        <Card className="bg-white border-2 border-[#a87437]/25 shadow-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-600">
              <Coffee className="w-4 h-4 text-blue-500" />
              Preparing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{preparingOrders.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-2 border-[#a87437]/25 shadow-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-600">
              <Package className="w-4 h-4 text-green-500" />
              Ready
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{readyOrders.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-2 border-[#a87437]/25 shadow-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-600">
              <span className="w-4 h-4 text-purple-500 font-semibold">₱</span>
              Total Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{filteredOrders.filter(o => !['completed','cancelled'].includes(String(o.status))).length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-[#a87437]/15 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by customer name or order ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/50 backdrop-blur-sm border-[#a87437]/20 focus:bg-white/70"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-[#a87437]/20 rounded-lg text-sm bg-white/50 backdrop-blur-sm focus:bg-white/70"
              aria-label="Filter by status"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
              <option value="completed">Completed</option>
            </select>
            <select
              value={orderTypeFilter}
              onChange={(e) => setOrderTypeFilter(e.target.value)}
              className="px-3 py-2 border border-[#a87437]/20 rounded-lg text-sm bg-white/50 backdrop-blur-sm focus:bg-white/70"
              aria-label="Filter by order type"
            >
              <option value="all">All Types</option>
              <option value="dine_in">Dine In</option>
              <option value="takeout">Takeout</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabbed Order Interface */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-[#a87437]/15 p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-white/50 backdrop-blur-sm border border-[#a87437]/20">
            <TabsTrigger value="preparing" className="flex items-center gap-2 data-[state=active]:bg-white/70">
              <Coffee className="w-4 h-4" />
              Preparing
              <Badge className="ml-2 bg-blue-100 text-blue-800 border-blue-200">
                {preparingOrders.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="ready" className="flex items-center gap-2 data-[state=active]:bg-white/70">
              <Package className="w-4 h-4" />
              Ready
              <Badge className="ml-2 bg-green-100 text-green-800 border-green-200">
                {readyOrders.length}
              </Badge>
            </TabsTrigger>
          </TabsList>


            {/* Preparing Orders Tab */}
            <TabsContent value="preparing" className="space-y-4">
              {preparingOrders.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <div className="bg-blue-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                    <Coffee className="w-10 h-10 text-blue-400" />
                  </div>
                  <p className="text-lg font-medium">No orders being prepared</p>
                  <p className="text-sm">Orders will appear here when preparation starts</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {preparingOrders.map((order) => (
                    <div key={order.orderId} className="bg-white/60 backdrop-blur-sm rounded-xl p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-[#a87437]/20">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg">{order.customerName}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                            <span className="font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded-full">#{order.orderId}</span>
                            <span>•</span>
                            <span>{order.orderType === 'dine_in' && order.tableNumber ? `Table ${order.tableNumber}` : 'Take Out'}</span>
                            <span>•</span>
                            <span>{new Date(order.orderTime).toLocaleTimeString()}</span>
                          </div>
                        </div>
                        <Badge className={getStatusColor(order.status)}>
                          {getStatusIcon(order.status)}
                          <span className="ml-1">{order.status}</span>
                        </Badge>
                      </div>
                      
                        <div className="space-y-2 mb-4">
                        {order.items.map((item, index) => (
                          <div key={index} className="flex justify-between text-sm bg-white/50 rounded-lg p-2">
                            <span className="text-gray-700">{item.quantity}x {item.name}</span>
                            <span className="text-gray-500 font-medium">₱{(() => {
                              const itemPrice = typeof item.price === 'number' && !isNaN(item.price) ? item.price : 
                                              (typeof item.customPrice === 'number' && !isNaN(item.customPrice) ? item.customPrice : 
                                               (typeof item.custom_price === 'number' && !isNaN(item.custom_price) ? item.custom_price : 
                                                (typeof item.base_price === 'number' && !isNaN(item.base_price) ? item.base_price : 0)));
                              const itemQuantity = typeof item.quantity === 'number' && !isNaN(item.quantity) ? item.quantity : 0;
                              const totalPrice = itemPrice * itemQuantity;
                              return isNaN(totalPrice) ? '0.00' : totalPrice.toFixed(2);
                            })()}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex justify-between items-center mb-2 pt-3 border-t border-[#a87437]/20">
                        <span className="font-semibold text-xl text-gray-900">₱{order.totalPrice}</span>
                      </div>
                      {order.notes && (
                        <div className="mb-4 text-sm italic text-gray-700 bg-yellow-50 border border-yellow-100 rounded-md p-3">
                          Customer Note: {order.notes}
                        </div>
                      )}
                      
                      {/* Receipt Viewing for Digital Payments */}
                      {(order.paymentMethod === 'gcash' || order.paymentMethod === 'paymaya') && order.paymentStatus === 'pending_verification' && (
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-blue-900">Payment Receipt Available</p>
                              <p className="text-xs text-blue-700">Customer has uploaded a receipt for verification</p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => {
                                const receiptUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/receipts/receipt/${order.orderId}`;
                                window.open(receiptUrl, '_blank');
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              View Receipt
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex gap-3">
                        {['preparing','processing'].includes(String(order.status)) && (
                          <Button
                            size="sm"
                            onClick={() => updateOrderStatus(order.orderId, 'ready')}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <Package className="w-4 h-4 mr-1" />
                            Mark as Ready
                          </Button>
                        )}
                        {['ready'].includes(String(order.status)) && (
                          <Button
                            size="sm"
                            onClick={() => updateOrderStatus(order.orderId, 'completed')}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Complete Order
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateOrderStatus(order.orderId, 'cancelled')}
                          className="bg-red-100 text-red-700 border-red-200 hover:bg-red-200"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Cancel Order
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Ready Orders Tab */}
            <TabsContent value="ready" className="space-y-4">
              {readyOrders.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <div className="bg-green-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                    <Package className="w-10 h-10 text-green-400" />
                  </div>
                  <p className="text-lg font-medium">No orders ready</p>
                  <p className="text-sm">Orders will appear here when they're ready for pickup</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {readyOrders.map((order) => (
                    <div key={order.orderId} className="bg-white/60 backdrop-blur-sm rounded-xl p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-[#a87437]/20">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg">{order.customerName}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                            <span className="font-medium bg-green-100 text-green-800 px-2 py-1 rounded-full">#{order.orderId}</span>
                            <span>•</span>
                            <span>{order.orderType === 'dine_in' && order.tableNumber ? `Table ${order.tableNumber}` : 'Take Out'}</span>
                            <span>•</span>
                            <span>{new Date(order.orderTime).toLocaleTimeString()}</span>
                          </div>
                        </div>
                        <Badge className={getStatusColor(order.status)}>
                          {getStatusIcon(order.status)}
                          <span className="ml-1">{order.status}</span>
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        {order.items.map((item, index) => (
                          <div key={index} className="flex justify-between text-sm bg-white/50 rounded-lg p-2">
                            <span className="text-gray-700">{item.quantity}x {item.name}</span>
                            <span className="text-gray-500 font-medium">₱{(() => {
                              const itemPrice = typeof item.price === 'number' && !isNaN(item.price) ? item.price : 
                                              (typeof item.customPrice === 'number' && !isNaN(item.customPrice) ? item.customPrice : 
                                               (typeof item.custom_price === 'number' && !isNaN(item.custom_price) ? item.custom_price : 
                                                (typeof item.base_price === 'number' && !isNaN(item.base_price) ? item.base_price : 0)));
                              const itemQuantity = typeof item.quantity === 'number' && !isNaN(item.quantity) ? item.quantity : 0;
                              const totalPrice = itemPrice * itemQuantity;
                              return isNaN(totalPrice) ? '0.00' : totalPrice.toFixed(2);
                            })()}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex justify-between items-center mb-4 pt-3 border-t border-[#a87437]/20">
                        <span className="font-semibold text-xl text-gray-900">₱{order.totalPrice}</span>
                      </div>
                      
                      <Button
                        size="sm"
                        onClick={() => updateOrderStatus(order.orderId, 'completed')}
                        className="bg-green-600 hover:bg-green-700 w-full shadow-lg"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Complete Order
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Payment Verification Modal */}
        {showPaymentModal && selectedOrder && !showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-md border border-white/20">
              <h2 className="text-xl font-bold mb-4">Verify Payment</h2>
              <p className="text-gray-600 mb-6">
                Verify payment for order #{selectedOrder.orderId}
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                  <select 
                    className="w-full p-3 border border-gray-200 rounded-lg bg-white/50 backdrop-blur-sm focus:bg-white/70"
                    aria-label="Select payment method"
                  >
                    <option value="cash">Cash</option>
                    <option value="gcash">GCash</option>
                    <option value="paymaya">PayMaya</option>
                  </select>
                </div>
                
                <div className="flex gap-3">
                  <Button
                    onClick={() => verifyPayment(selectedOrder.orderId, 'cash')}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 shadow-lg"
                  >
                    Verify Payment
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 bg-white/50 backdrop-blur-sm border-white/20 hover:bg-white/70"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Success Modal */}
        {showSuccessModal && paymentSuccessData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h2>
                <p className="text-gray-600 mb-4">Payment has been processed and verified. Order is now pending preparation.</p>
                <div className="bg-green-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-green-800">
                    <strong>Order ID:</strong> {paymentSuccessData.orderId}
                  </p>
                  <p className="text-sm text-green-800">
                    <strong>Amount Paid:</strong> ₱{paymentSuccessData.amount}
                  </p>
                  <p className="text-sm text-green-800">
                    <strong>Change:</strong> ₱{paymentSuccessData.change}
                  </p>
                </div>
                <Button
                  onClick={() => {
                    console.log('Continue to POS clicked');
                    setShowSuccessModal(false);
                    setPaymentSuccessData(null);
                    setSelectedOrder(null); // Clear selected order
                    setShowPaymentModal(false); // Ensure payment modal is closed
                    
                    // Try React Router navigation first
                    try {
                      console.log('Attempting React Router navigation to /admin/pos');
                      navigate('/admin/pos');
                    } catch (error) {
                      console.warn('React Router navigation failed, using window.location:', error);
                      // Fallback to window.location if React Router fails
                      window.location.href = '/admin/pos';
                    }
                  }}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  Continue to POS
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminOrders; 
