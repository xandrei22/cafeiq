import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, User, CreditCard } from 'lucide-react';

interface GuestOrderFormProps {
  cartItems: any[];
  onOrderPlaced: (orderId: string) => void;
  onClose: () => void;
  tableNumber?: string;
}

interface GuestCustomerInfo {
  name: string;
  paymentMethod: string;
  notes: string;
  tableNumber: string;
}

export default function GuestOrderForm({ cartItems, onOrderPlaced, onClose, tableNumber }: GuestOrderFormProps) {
  const navigate = useNavigate();
  const [customerInfo, setCustomerInfo] = useState<GuestCustomerInfo>({
    name: '',
    paymentMethod: 'cash',
    notes: '',
    tableNumber: tableNumber || ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');

  const handleInputChange = (field: keyof GuestCustomerInfo, value: string) => {
    setCustomerInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      const itemTotal = (item.customPrice || item.price) * item.quantity;
      return total + itemTotal;
    }, 0);
  };

  const handleGuestCheckout = async () => {
    if (!customerInfo.name.trim()) {
      setError('Name is required');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      
      // Get table number from URL parameter
      const urlParams = new URLSearchParams(window.location.search);
      const tableFromUrl = urlParams.get('table');
      const tableNumber = tableFromUrl ? parseInt(tableFromUrl) : (customerInfo.tableNumber ? parseInt(customerInfo.tableNumber) : null);

      const orderData = {
        customerName: customerInfo.name,
        customerEmail: undefined,
        customerPhone: undefined,
        items: cartItems.map(item => ({
          menuItemId: parseInt(item.id),
          name: item.name,
          quantity: item.quantity,
          price: item.customPrice || item.price,
          notes: item.notes || '',
          customizations: Array.isArray(item.customizations) ? item.customizations : []
        })),
        totalAmount: calculateTotal(),
        paymentMethod: customerInfo.paymentMethod,
        notes: customerInfo.notes,
        tableNumber: tableNumber
      };

      console.log('Sending guest order data:', orderData);

      const response = await fetch(`${API_URL}/api/guest/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(orderData)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to place order');
      }

      console.log('Guest order placed successfully:', result);
      onOrderPlaced(result.orderId);
      // Navigate to success page without table parameter
      navigate(`/guest/order-success/${result.orderId}`);
      
    } catch (error) {
      console.error('Guest checkout error:', error);
      setError(error instanceof Error ? error.message : 'Failed to place order');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-xl">
            <User className="h-5 w-5" />
            Guest Checkout
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <div>
              <Label htmlFor="name" className="mb-1 block">Name to call *</Label>
              <Input
                id="name"
                type="text"
                value={customerInfo.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter the name we'll call for serving"
                required
              />
            </div>

            <div>
              <Label htmlFor="tableNumber" className="mb-1 block">
                Table Number {tableNumber ? '(Detected from QR Code)' : '(Optional)'}
              </Label>
              <Input
                id="tableNumber"
                type="number"
                min="1"
                max="6"
                value={customerInfo.tableNumber}
                onChange={(e) => handleInputChange('tableNumber', e.target.value)}
                placeholder={tableNumber ? `Table ${tableNumber} detected` : "Enter table number (1-6)"}
                disabled={!!tableNumber}
                className={tableNumber ? "bg-green-50 border-green-300" : ""}
              />
              {tableNumber && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ Table {tableNumber} automatically detected from QR code scan
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="paymentMethod" className="mb-1 block">Payment Method</Label>
              <select
                id="paymentMethod"
                value={customerInfo.paymentMethod}
                onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                title="Select payment method"
              >
                <option value="cash">Cash</option>
                <option value="gcash">GCash</option>
                <option value="paymaya">PayMaya</option>
                <option value="card">Credit/Debit Card</option>
              </select>
            </div>

            <div>
              <Label htmlFor="notes" className="mb-1 block">Special Instructions (Optional)</Label>
              <textarea
                id="notes"
                value={customerInfo.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any special instructions for your order"
                className="w-full p-2 border border-gray-300 rounded-md h-20 resize-none"
              />
            </div>
          </div>

          {/* Minimal Guest Inputs removed; captured above */}

          {/* Order Summary */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-lg mb-2">Order Summary</h3>
            <div className="space-y-2">
              {cartItems.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>{item.quantity}x {item.name}</span>
                  <span>₱{((item.customPrice || item.price) * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-semibold text-lg border-t pt-2 mt-2">
              <span>Total:</span>
              <span>₱{calculateTotal().toFixed(2)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGuestCheckout}
              disabled={isProcessing || !customerInfo.name.trim()}
              className="flex-1 bg-[#a87437] hover:bg-[#8f652f]"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Place Order
                </>
              )}
            </Button>
          </div>

          {/* Guest Notice */}
          <div className="text-xs text-gray-600 bg-yellow-50 p-3 rounded-md">
            <strong>Guest Order Notice:</strong> As a guest, you won't earn loyalty points or have access to order history. 
            Consider creating an account for a better experience!
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
