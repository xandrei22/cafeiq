import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Coffee, 
  Clock, 
  CheckCircle, 
  Users, 
  QrCode,
  AlertCircle,
  DollarSign
} from 'lucide-react';
import SimplePOS from './SimplePOS';
import PaymentProcessor from './PaymentProcessor';
import { io, Socket } from 'socket.io-client';

interface Order {
  id: string;
  orderId: string;
  customerName: string;
  tableNumber: number;
  items: any[];
  totalPrice: number;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed';
  paymentMethod: string;
  orderTime: string;
  notes?: string;
}


const POSDashboard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalRevenue: 0
  });
  const location = useLocation();
  const isAdminRoute = String(location.pathname || '').startsWith('/admin');

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

  useEffect(() => {
    let newSocket: Socket | null = null;
    let isMounted = true;

    const initializeSocket = () => {
      try {
        // Initialize Socket.IO connection with proper backend URL
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
        newSocket = io(API_URL, {
          transports: ['websocket', 'polling'],
          timeout: 30000,
          forceNew: true,
          autoConnect: true,
          withCredentials: true
        });
        setSocket(newSocket);

        // Connection event handlers
        newSocket.on('connect', () => {
          if (isMounted && newSocket) {
            // Join both rooms so admin or staff receives all order/payment updates
            newSocket.emit('join-staff-room');
            newSocket.emit('join-admin-room');
          }
        });

        newSocket.on('disconnect', () => {
          console.log('POS Socket disconnected');
        });

        newSocket.on('error', (error) => {
          console.warn('POS Socket error:', error);
        });

        // Listen for real-time updates
        newSocket.on('new-order-received', (orderData) => {
          if (isMounted) {
            fetchOrders();
            fetchStats();
          }
        });

        newSocket.on('order-updated', (updateData) => {
          if (isMounted) {
            fetchOrders();
            fetchStats();
          }
        });

        newSocket.on('payment-updated', (paymentData) => {
          if (isMounted) {
            fetchOrders();
            fetchStats();
          }
        });

      } catch (error) {
        console.error('POS Socket initialization error:', error);
      }
    };

    initializeSocket();

    // Initial data fetch
    fetchOrders();
    fetchStats();

    // Fallback: Poll for updates every 5 seconds if Socket.IO fails
    const pollInterval = setInterval(() => {
      if (isMounted) {
        fetchOrders();
        fetchStats();
      }
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      if (newSocket) {
        try {
          newSocket.removeAllListeners();
          newSocket.close();
        } catch (error) {
          console.warn('POS Socket cleanup error:', error);
        }
      }
    };
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch(`/api/orders`, { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };


  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/orders/stats`, { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setStats({
          totalOrders: data.stats.totalOrders || 0,
          pendingOrders: data.stats.pendingOrders || 0,
          completedOrders: data.stats.completedOrders || 0,
          totalRevenue: data.stats.totalRevenue || 0
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        fetchOrders();
        fetchTables();
        fetchStats();
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-500', icon: Clock },
      preparing: { color: 'bg-blue-500', icon: Coffee },
      ready: { color: 'bg-green-500', icon: CheckCircle },
      completed: { color: 'bg-gray-500', icon: CheckCircle },
      cancelled: { color: 'bg-red-500', icon: AlertCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config?.icon || AlertCircle;

    return (
      <Badge className={`${config?.color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const color = status === 'paid' ? 'bg-green-500' : status === 'failed' ? 'bg-red-500' : 'bg-yellow-500';
    return (
      <Badge className={`${color} text-white`}>
        <DollarSign className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 mx-2 sm:mx-4 lg:mx-6 p-4 bg-[#f5f5f5] min-h-screen">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Point of Sale</h1>
          <p className="text-sm sm:text-base text-gray-600">Select items and manage orders</p>
        </div>

        {/* Stats Cards - 2x2 Grid Above Take Order */}
        <div className="grid grid-cols-2 gap-4 mb-6 bg-[#f5f5f5] p-2 rounded-xl">
          <Card className="bg-white border shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-3 bg-[#a87437]/10 rounded-lg">
                  <Coffee className="h-8 w-8 text-[#a87437]" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-[#6B5B5B]">Total Orders</p>
                  <p className="text-2xl font-bold text-[#3f3532]">{stats.totalOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-[#6B5B5B]">Pending</p>
                  <p className="text-2xl font-bold text-[#3f3532]">{stats.pendingOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-[#6B5B5B]">Completed</p>
                  <p className="text-2xl font-bold text-[#3f3532]">{stats.completedOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg text-green-600 font-semibold text-xl">₱</div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-[#6B5B5B]">Revenue</p>
                  <p className="text-2xl font-bold text-[#3f3532]">₱{stats.totalRevenue.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Unified SimplePOS instance renders menu + sidebar sharing a single cart */}
        <div className="mb-6">
          <SimplePOS 
            children={
              <PaymentProcessor 
                orders={orders.filter(o => o.paymentStatus === 'pending')}
                onPaymentProcessed={fetchOrders}
                staffId={isAdminRoute ? 'admin' : 'staff'}
              />
            }
          />
        </div>

      </div>
    </div>
  );
};

export default POSDashboard; 