import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { ArrowLeft, Search, Clock, CheckCircle, XCircle, Loader2, Package } from 'lucide-react';
import { CustomerNavbar } from '../ui/CustomerNavbar';

interface Order {
  orderId: string;
  customerName: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  orderTime: string;
  estimatedReadyTime: string;
  items: any[];
  totalPrice: number;
  tableNumber: number | null;
  customerEmail: string;
}

const GuestOrderTracking: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [searchOrderId, setSearchOrderId] = useState(orderId || '');

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'preparing':
        return 'bg-blue-100 text-blue-800';
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'preparing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'ready':
        return <CheckCircle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getProgressPercentage = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 25;
      case 'preparing':
        return 50;
      case 'ready':
        return 75;
      case 'completed':
        return 100;
      case 'cancelled':
        return 0;
      default:
        return 0;
    }
  };

  const fetchOrder = async (orderId: string) => {
    if (!orderId) {
      setError('Please enter your order ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const response = await fetch(`${API_URL}/api/guest/order-status/${orderId}`);
      const data = await response.json();

      if (data.success) {
        setOrder(data.order);
      } else {
        setError(data.message || 'Order not found');
        setOrder(null);
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      setError('Failed to fetch order details');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchOrder(searchOrderId);
  };

  useEffect(() => {
    if (orderId) {
      setSearchOrderId(orderId);
    }
  }, [orderId]);

  // Realtime updates: connect to socket and join order room
  useEffect(() => {
    // Only attach sockets if we have an orderId being viewed
    const activeOrderId = orderId || searchOrderId;
    if (!activeOrderId) return;

    const s = io();
    setSocket(s);

    // Join a dedicated room for this order (backend expects 'join-order-room' with raw id)
    s.emit('join-order-room', activeOrderId);

    const handleUpdate = (payload: any) => {
      if (!payload) return;
      if (payload.orderId && payload.orderId !== activeOrderId) return;
      setOrder(prev => {
        const base = prev || {
          orderId: activeOrderId,
          customerName: '',
          status: payload.status || 'pending',
          paymentStatus: payload.paymentStatus || 'unpaid',
          paymentMethod: payload.paymentMethod || prev?.paymentMethod || 'cash',
          orderTime: prev?.orderTime || new Date().toISOString(),
          estimatedReadyTime: prev?.estimatedReadyTime || '',
          totalPrice: prev?.totalPrice || 0,
          tableNumber: prev?.tableNumber ?? null,
          customerEmail: prev?.customerEmail || ''
        } as Order;
        return {
          ...base,
          status: payload.status ?? base.status,
          paymentStatus: payload.paymentStatus ?? base.paymentStatus,
          paymentMethod: payload.paymentMethod ?? base.paymentMethod,
        };
      });
    };

    s.on('order-updated', handleUpdate);
    s.on('payment-updated', handleUpdate);

    return () => {
      s.off('order-updated', handleUpdate);
      s.off('payment-updated', handleUpdate);
      s.close();
    };
  }, [orderId, searchOrderId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerNavbar />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
          <h1 className="text-3xl font-bold text-[#6B5B5B]">Guest Order Tracking</h1>
        </div>

        {/* Search Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Track Your Order
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="orderId">Order ID</Label>
                <Input
                  id="orderId"
                  type="text"
                  value={searchOrderId}
                  onChange={(e) => setSearchOrderId(e.target.value)}
                  placeholder="Enter your order ID"
                />
              </div>
            </div>
            <Button
              onClick={handleSearch}
              disabled={loading || !searchOrderId.trim()}
              className="w-full mt-4 bg-[#a87437] hover:bg-[#8f652f] text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Track Order
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Order Details */}
        {order && (
          <div className="space-y-6">
            {/* Order Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Order Status</span>
                  <Badge className={getStatusColor(order.status)}>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(order.status)}
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Order ID</p>
                    <p className="font-semibold">{order.orderId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Customer</p>
                    <p className="font-semibold">{order.customerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Order Time</p>
                    <p className="font-semibold">{new Date(order.orderTime).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Estimated Ready Time</p>
                    <p className="font-semibold">{new Date(order.estimatedReadyTime).toLocaleString()}</p>
                  </div>
                  {order.tableNumber && (
                    <div>
                      <p className="text-sm text-gray-600">Table Number</p>
                      <p className="font-semibold">Table {order.tableNumber}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Payment Method</p>
                    <p className="font-semibold capitalize">{order.paymentMethod}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                        {item.notes && (
                          <p className="text-sm text-gray-600">Notes: {item.notes}</p>
                        )}
                        {item.customizations && item.customizations.length > 0 && (
                          <div className="text-sm text-gray-600">
                            Customizations: {item.customizations.map(c => c.name).join(', ')}
                          </div>
                        )}
                      </div>
                      <p className="font-semibold">₱{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center border-t pt-4 mt-4">
                  <span className="text-lg font-bold">Total:</span>
                  <span className="text-lg font-bold text-[#a87437]">₱{order.totalPrice.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Status Information */}
            <Card>
              <CardHeader>
                <CardTitle>Order Progress</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Progress</span>
                    <span className="text-sm font-medium text-[#a87437]">{getProgressPercentage(order.status)}% Complete</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-[#a87437] h-3 rounded-full transition-all duration-500 ease-in-out"
                      style={{ width: `${getProgressPercentage(order.status)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Progress Steps */}
                <div className="space-y-4">
                  {/* Order Received */}
                  <div className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        order.status === 'pending' || order.status === 'preparing' || order.status === 'ready' || order.status === 'completed'
                          ? 'bg-[#a87437] text-white' 
                          : 'bg-gray-300 text-gray-600'
                      }`}>
                        <CheckCircle className="h-4 w-4" />
                      </div>
                      {order.status !== 'pending' && order.status !== 'preparing' && order.status !== 'ready' && order.status !== 'completed' && (
                        <div className="w-0.5 h-6 bg-gray-300 mt-2"></div>
                      )}
                    </div>
                    <div className="ml-4 flex-1">
                      <p className={`text-sm font-medium ${order.status === 'pending' || order.status === 'preparing' || order.status === 'ready' || order.status === 'completed' ? 'text-[#a87437]' : 'text-gray-600'}`}>
                        Order Received
                      </p>
                      <p className="text-xs text-gray-500">Your order has been received and is being processed</p>
                    </div>
                  </div>

                  {/* Preparing */}
                  <div className="flex items-center">
                    <div className="flex flex-col items-center">
                      {order.status === 'pending' && (
                        <div className="w-0.5 h-6 bg-gray-300"></div>
                      )}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        order.status === 'preparing' || order.status === 'ready' || order.status === 'completed'
                          ? 'bg-[#a87437] text-white' 
                          : 'bg-gray-300 text-gray-600'
                      }`}>
                        <Loader2 className={`h-4 w-4 ${order.status === 'preparing' ? 'animate-spin' : ''}`} />
                      </div>
                      {order.status !== 'preparing' && order.status !== 'ready' && order.status !== 'completed' && (
                        <div className="w-0.5 h-6 bg-gray-300 mt-2"></div>
                      )}
                    </div>
                    <div className="ml-4 flex-1">
                      <p className={`text-sm font-medium ${order.status === 'preparing' || order.status === 'ready' || order.status === 'completed' ? 'text-[#a87437]' : 'text-gray-600'}`}>
                        Preparing
                      </p>
                      <p className="text-xs text-gray-500">Your order is being prepared by our kitchen staff</p>
                    </div>
                  </div>

                  {/* Ready for Pickup */}
                  <div className="flex items-center">
                    <div className="flex flex-col items-center">
                      {order.status === 'preparing' && (
                        <div className="w-0.5 h-6 bg-gray-300"></div>
                      )}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        order.status === 'ready' || order.status === 'completed'
                          ? 'bg-[#a87437] text-white' 
                          : 'bg-gray-300 text-gray-600'
                      }`}>
                        <Package className="h-4 w-4" />
                      </div>
                      {order.status !== 'ready' && order.status !== 'completed' && (
                        <div className="w-0.5 h-6 bg-gray-300 mt-2"></div>
                      )}
                    </div>
                    <div className="ml-4 flex-1">
                      <p className={`text-sm font-medium ${order.status === 'ready' || order.status === 'completed' ? 'text-[#a87437]' : 'text-gray-600'}`}>
                        Ready for Pickup
                      </p>
                      <p className="text-xs text-gray-500">Your order is ready for pickup</p>
                    </div>
                  </div>

                  {/* Completed */}
                  <div className="flex items-center">
                    <div className="flex flex-col items-center">
                      {order.status === 'ready' && (
                        <div className="w-0.5 h-6 bg-gray-300"></div>
                      )}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        order.status === 'completed'
                          ? 'bg-[#a87437] text-white' 
                          : 'bg-gray-300 text-gray-600'
                      }`}>
                        <CheckCircle className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="ml-4 flex-1">
                      <p className={`text-sm font-medium ${order.status === 'completed' ? 'text-[#a87437]' : 'text-gray-600'}`}>
                        Completed
                      </p>
                      <p className="text-xs text-gray-500">Order has been completed successfully</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Guest Notice */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-yellow-800">
                <Clock className="h-5 w-5" />
                <span className="font-semibold">Guest Order Notice</span>
              </div>
              <p className="text-yellow-700 text-sm mt-1">
                This is a guest order. For order history and loyalty points, consider creating an account for future orders.
              </p>
            </div>
          </div>
        )}

        {/* No Order State */}
        {!order && !loading && !error && (
          <Card>
            <CardContent className="text-center py-8">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Track Your Order</h3>
              <p className="text-gray-500">Enter your order ID above to track your order status.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default GuestOrderTracking;
