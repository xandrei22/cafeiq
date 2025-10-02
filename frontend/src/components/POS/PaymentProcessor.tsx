import React, { useState } from 'react';
import { QrCode, CheckCircle, DollarSign, CreditCard, Eye, FileImage, X } from 'lucide-react';
import CashPaymentModal from './CashPaymentModal';

interface Order {
  orderId: string;
  customerName: string;
  tableNumber: number;
  totalPrice: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  items: any[];
  cancelledBy?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  receiptPath?: string;
}

interface PaymentProcessorProps {
  orders: Order[];
  onPaymentProcessed: () => void;
  staffId: string;
  children?: React.ReactNode;
}

const PaymentProcessor: React.FC<PaymentProcessorProps> = ({ orders, onPaymentProcessed, staffId, children }) => {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showCashModal, setShowCashModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'cancelled'>('pending');

  const pendingOrders = orders.filter(order => 
    order.paymentStatus === 'pending' && 
    order.status !== 'cancelled'
  );
  
  const cancelledOrders = orders.filter(order => order.status === 'cancelled');

  // Real-time updates are handled automatically by the parent component

  // Add a small indicator to show real-time updates are working
  const [lastUpdate, setLastUpdate] = React.useState<Date | null>(null);
  
  React.useEffect(() => {
    if (orders.length > 0) {
      setLastUpdate(new Date());
    }
  }, [orders]);

  const viewReceipt = async (orderId: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/receipts/receipt/${orderId}`, {
        method: 'GET',
      });

      if (response.ok) {
        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        setReceiptImage(imageUrl);
        setShowReceiptModal(true);
      } else {
        alert('No receipt found for this order. Customer may not have uploaded it yet.');
      }
    } catch (error) {
      console.error('Error viewing receipt:', error);
      alert('Error loading receipt. Please try again.');
    }
  };

  const verifyPayment = async (orderId: string) => {
    try {
      setProcessingPayment(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/orders/${orderId}/payment-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          payment_status: 'paid',
          payment_method: selectedOrder?.paymentMethod
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Show success message with better visibility
          alert('Payment verified successfully! Order is now pending preparation.');
          onPaymentProcessed();
          setSelectedOrder(null);
          setShowReceiptModal(false);
          // Stay in POS - no navigation needed
        } else {
          alert(`Failed to verify payment: ${result.message}`);
        }
      } else {
        alert('Failed to verify payment. Please try again.');
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      alert('Error verifying payment. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
        return <DollarSign className="w-4 h-4" />;
      case 'gcash':
      case 'paymaya':
        return <CreditCard className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  const getPaymentMethodBadge = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
        return <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Cash</span>;
      case 'gcash':
        return <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">GCash</span>;
      case 'paymaya':
        return <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">PayMaya</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">{method}</span>;
    }
  };

  const handleCashPayment = () => {
    setShowCashModal(true);
  };

  const handleCashPaymentProcessed = () => {
    setShowCashModal(false);
    setSelectedOrder(null);
    onPaymentProcessed();
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 w-full self-start">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Payment Processing</h2>
        {lastUpdate && (
          <div className="flex items-center text-xs text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            Updated {lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Optional slot: render Customer Info / Cart directly under the title */}
      {children && (
        <div className="mb-6">
          {children}
        </div>
      )}
      
      <div className="grid grid-cols-1 gap-6">
        {/* Orders Tabs */}
        <div>
          <div className="flex space-x-2 mb-3">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'pending'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending Payments ({pendingOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('cancelled')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'cancelled'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Cancelled Orders ({cancelledOrders.length})
            </button>
          </div>

          {/* Pending Orders Tab */}
          {activeTab === 'pending' && (
            <>
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Pending Payments</h3>
              {pendingOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                  <p>No pending payments</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {pendingOrders.map((order) => (
                    <div
                      key={order.orderId}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedOrder?.orderId === order.orderId
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedOrder(order)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-800">Order #{order.orderId}</span>
                        {getPaymentMethodBadge(order.paymentMethod)}
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Customer: {order.customerName}</p>
                        <p>Table: {order.tableNumber}</p>
                        <p className="font-semibold text-green-600">₱{order.totalPrice}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Cancelled Orders Tab */}
          {activeTab === 'cancelled' && (
            <>
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Cancelled Orders</h3>
              {cancelledOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                  <p>No cancelled orders</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {cancelledOrders.map((order) => (
                    <div
                      key={order.orderId}
                      className="p-4 border border-red-200 rounded-lg bg-red-50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-red-800">Order #{order.orderId}</span>
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">Cancelled</span>
                      </div>
                      <div className="text-sm text-red-700 space-y-1">
                        <p>Customer: {order.customerName}</p>
                        <p>Table: {order.tableNumber}</p>
                        <p className="font-semibold text-red-600">₱{order.totalPrice}</p>
                        <p className="text-xs text-red-600 mt-2">
                          Cancelled by: {order.cancelledBy || 'Staff'}
                        </p>
                        <p className="text-xs text-red-600">
                          Reason: {order.cancellationReason || 'No reason provided'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Payment Processing Panel */}
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Process Payment</h3>
          
          {selectedOrder ? (
            <>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-gray-800 mb-2">Order Details</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <p><strong>Order ID:</strong> {selectedOrder.orderId}</p>
                  <p><strong>Customer:</strong> {selectedOrder.customerName}</p>
                  <p><strong>Table:</strong> {selectedOrder.tableNumber}</p>
                  <p><strong>Total:</strong> ₱{selectedOrder.totalPrice}</p>
                  <p><strong>Method:</strong> {selectedOrder.paymentMethod}</p>
                </div>
              </div>

              {/* Payment Options */}
              <div className="space-y-3">
                {selectedOrder.paymentMethod === 'cash' ? (
                  <button
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    onClick={handleCashPayment}
                    disabled={processingPayment}
                  >
                    <DollarSign className="w-5 h-5" />
                    Process Cash Payment
                  </button>
                ) : (
                  <>
                    <button
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                      onClick={() => viewReceipt(selectedOrder.orderId)}
                      disabled={processingPayment}
                    >
                      <Eye className="w-5 h-5" />
                      View {selectedOrder.paymentMethod.toUpperCase()} Receipt
                    </button>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-yellow-800">
                        <FileImage className="w-4 h-4" />
                        <span className="text-sm font-medium">Digital Payment Status</span>
                      </div>
                      <p className="text-xs text-yellow-700 mt-1">
                        Customer should have scanned the static QR code and uploaded their payment receipt.
                      </p>
                    </div>
                  </>
                )}

                <div className="flex gap-2">
                  <button
                    className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 font-semibold py-2 px-4 rounded-lg transition-colors"
                    onClick={async () => {
                      if (confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
                        try {
                          // Use the staff orders endpoint instead of admin
                          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/orders/${selectedOrder.orderId}/status`, {
                            method: 'PUT',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ 
                              status: 'cancelled',
                              cancelledBy: staffId,
                              cancellationReason: 'Cancelled by staff during payment processing',
                              cancelledAt: new Date().toISOString()
                            }),
                          });
                          
                          if (response.ok) {
                            const result = await response.json();
                            if (result.success) {
                              alert('Order cancelled successfully');
                              onPaymentProcessed(); // Refresh the orders list
                              setSelectedOrder(null);
                              setQrCode(null);
                            } else {
                              alert(`Failed to cancel order: ${result.error || 'Unknown error'}`);
                            }
                          } else {
                            const errorData = await response.json().catch(() => ({}));
                            alert(`Failed to cancel order: ${errorData.message || `HTTP ${response.status}`}`);
                          }
                        } catch (error) {
                          console.error('Error cancelling order:', error);
                          alert('Error cancelling order: Network or server error');
                        }
                      }
                    }}
                  >
                    Cancel Order
                  </button>
                  <button
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors"
                    onClick={() => {
                      setSelectedOrder(null);
                      setQrCode(null);
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CreditCard className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>Select an order to process payment</p>
            </div>
          )}
        </div>
      </div>

      {/* Cash Payment Modal */}
      {showCashModal && selectedOrder && (
        <CashPaymentModal
          order={selectedOrder}
          onClose={() => setShowCashModal(false)}
          onPaymentProcessed={handleCashPaymentProcessed}
          staffId={staffId}
        />
      )}

      {/* Receipt Viewing Modal */}
      {showReceiptModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                Payment Receipt - {selectedOrder.paymentMethod.toUpperCase()}
              </h3>
              <button
                onClick={() => {
                  setShowReceiptModal(false);
                  if (receiptImage) {
                    URL.revokeObjectURL(receiptImage);
                    setReceiptImage(null);
                  }
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Close Receipt"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Order Details */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">Order Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                  <p><strong>Order ID:</strong> {selectedOrder.orderId}</p>
                  <p><strong>Customer:</strong> {selectedOrder.customerName}</p>
                  <p><strong>Table:</strong> {selectedOrder.tableNumber}</p>
                  <p><strong>Total:</strong> ₱{selectedOrder.totalPrice}</p>
                </div>
              </div>

              {/* Receipt Image */}
              {receiptImage && (
                <div className="text-center">
                  <img 
                    src={receiptImage} 
                    alt="Payment Receipt" 
                    className="max-w-full max-h-96 mx-auto border rounded-lg shadow-sm"
                  />
                  <p className="text-sm text-gray-600 mt-2">
                    Customer uploaded receipt for verification
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowReceiptModal(false);
                    if (receiptImage) {
                      URL.revokeObjectURL(receiptImage);
                      setReceiptImage(null);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => verifyPayment(selectedOrder.orderId)}
                  disabled={processingPayment}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {processingPayment ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Verify Payment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentProcessor; 