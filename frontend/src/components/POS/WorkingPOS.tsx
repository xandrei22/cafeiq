import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { io } from 'socket.io-client';
import { 
  Coffee, 
  Clock, 
  CheckCircle
} from 'lucide-react';
import PaymentProcessor from './PaymentProcessor';
import SimplePOS from './SimplePOS';

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


const WorkingPOS: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalRevenue: 0
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  useEffect(() => {
    // Initialize Socket.IO connection
    const newSocket = io(API_URL);

    // Join staff room for real-time updates
    newSocket.emit('join-staff-room');

    // Listen for real-time updates
    newSocket.on('new-order-received', (orderData) => {
      console.log('New order received:', orderData);
      fetchOrders();
      fetchStats();
    });

    newSocket.on('order-updated', (updateData) => {
      console.log('Order updated:', updateData);
      fetchOrders();
      fetchStats();
    });

    newSocket.on('payment-updated', (paymentData) => {
      console.log('Payment updated:', paymentData);
      fetchOrders();
      fetchStats();
    });

    // Initial data fetch
    fetchOrders();
    fetchStats();

    return () => {
      newSocket.close();
    };
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch(`${API_URL}/api/orders`);
      const data = await response.json();
      if (data.success) {
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };


  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/orders/stats`);
      const data = await response.json();
      if (data.success) {
        setStats({
          totalOrders: Number(data.stats.totalOrders || 0),
          pendingOrders: Number(data.stats.pendingOrders || 0),
          completedOrders: Number(data.stats.completedOrders || 0),
          totalRevenue: Number(data.stats.totalRevenue || 0)
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };


  return (
    <div className="space-y-4 sm:space-y-6 mx-2 sm:mx-4 lg:mx-6 p-4 bg-gray-50 min-h-screen">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#3f3532] mb-2">Point of Sale</h1>
          <p className="text-[#6B5B5B]">Select items and manage orders</p>
        </div>

        {/* Stats Cards - 2x2 Grid Above Take Order */}
        <div className="grid grid-cols-2 gap-4 mb-6">
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

        {/* Main Content - Menu and sidebar with spacious proportions */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_24rem] gap-6 items-start">
          {/* Left: Take Order (menu filters + grid) under Completed */}
          <div className="space-y-4 order-1">
            <SimplePOS 
              children={
                <PaymentProcessor 
                  orders={orders.filter(o => o.paymentStatus === 'pending')}
                  onPaymentProcessed={fetchOrders}
                  staffId="admin"
                />
              }
            />
          </div>

          {/* Right: Empty space - PaymentProcessor now under cart */}
          <div className="space-y-4 order-2">
            {/* Payment processing is now under the cart in SimplePOS */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkingPOS; 