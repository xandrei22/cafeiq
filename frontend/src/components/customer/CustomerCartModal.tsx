import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Minus, Plus, X, Trash2, ShoppingCart } from 'lucide-react';

export interface CustomerCartItem {
  id: number;
  name: string;
  description?: string;
  base_price: number;
  cartItemId: string;
  quantity: number;
  notes?: string;
  customizations?: Record<string, any> | null;
  customPrice?: number | null;
}

interface Props {
  isOpen: boolean;
  cart: CustomerCartItem[];
  onClose: () => void;
  onUpdateQuantity: (cartItemId: string, quantity: number) => void;
  onUpdateNotes: (cartItemId: string, notes: string) => void;
  onRemove: (cartItemId: string) => void;
  onClear: () => void;
  onCheckout: (paymentMethod: string) => void;
  user?: any; // Add user prop for authentication status
  hasTableAccess?: boolean; // Add table access prop
}

export default function CustomerCartModal({
  isOpen,
  cart,
  onClose,
  onUpdateQuantity,
  onUpdateNotes,
  onRemove,
  onClear,
  onCheckout,
  user,
  hasTableAccess = true
}: Props) {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'gcash' | 'paymaya'>('cash');
  const [orderNotes, setOrderNotes] = useState('');

  if (!isOpen) return null;

  const total = cart.reduce((sum, item) => {
    const price = item.customPrice ?? item.base_price;
    return sum + price * item.quantity;
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2 font-semibold">
            <ShoppingCart className="w-5 h-5" />
            Cart ({cart.length})
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded" aria-label="Close cart">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[70vh] overflow-auto">
          {cart.length === 0 ? (
            <div className="text-center text-gray-500 py-12">Cart is empty</div>
          ) : (
            cart.map((item) => (
              <div key={item.cartItemId} className="p-4 bg-white rounded-lg border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{item.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      {item.customPrice && item.customPrice !== item.base_price ? (
                        <>
                          <span className="text-sm text-gray-500 line-through">₱{item.base_price}</span>
                          <span className="text-sm text-blue-600 font-medium">₱{item.customPrice}</span>
                        </>
                      ) : (
                        <span className="text-sm text-gray-600">₱{item.base_price}</span>
                      )}
                      {item.customizations && (
                        <Badge variant="secondary" className="text-xs">Customized</Badge>
                      )}
                    </div>
                    {item.customizations && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                        <div className="font-medium mb-1">Customizations:</div>
                        {Object.entries(item.customizations).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="capitalize">{key}:</span>
                            <span className="font-medium">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => onUpdateQuantity(item.cartItemId, item.quantity - 1)} className="h-8 w-8 p-0">
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <Button size="sm" variant="outline" onClick={() => onUpdateQuantity(item.cartItemId, item.quantity + 1)} className="h-8 w-8 p-0">
                      <Plus className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onRemove(item.cartItemId)} className="h-8 w-8 p-0 text-red-600 hover:text-red-700">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* Item-level notes removed; order notes field moved below in footer */}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t space-y-3">
          {cart.length > 0 && (
            <>
              {/* Authentication Status */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${user ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-sm font-medium text-gray-700">
                      {user ? `Logged in as: ${user.name || user.email}` : 'Not logged in'}
                    </span>
                  </div>
                  {!user && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        const urlParams = new URLSearchParams(window.location.search);
                        const tableFromUrl = urlParams.get('table');
                        const loginUrl = tableFromUrl ? `/login?table=${tableFromUrl}` : '/login';
                        window.location.href = loginUrl;
                      }}
                      className="text-xs h-7 px-2"
                    >
                      Log In
                    </Button>
                  )}
                </div>
                {!user && (
                  <p className="text-xs text-gray-500 mt-1">
                    You need to log in to place an order
                  </p>
                )}
                {!hasTableAccess && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠️ No table access detected. For dine-in orders, please scan the QR code on your table.
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['cash','gcash','paymaya'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`p-2 rounded-lg border-2 transition-all ${paymentMethod === m ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}
                    >
                      <div className="text-center">
                        <div className="text-xs font-medium capitalize">{m}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Type */}
              <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                <div className="text-blue-900 font-semibold">Total: ₱{total.toFixed(2)}</div>
                <div className="text-xs text-blue-700">{cart.length} item{cart.length !== 1 ? 's' : ''}</div>
              </div>

              {/* Order Notes below Order Type */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Notes (optional)</label>
                <Input
                  placeholder="Any special requests or notes..."
                  value={orderNotes}
                  onChange={(e) => {
                    const val = e.target.value;
                    setOrderNotes(val);
                    // Propagate to each cart item so upstream order notes aggregation works
                    cart.forEach(ci => onUpdateNotes(ci.cartItemId, val));
                  }}
                  className="h-10"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={onClear} variant="outline" className="flex-1 h-10">Clear Cart</Button>
                <Button 
                  onClick={() => onCheckout(paymentMethod)} 
                  className="flex-1 h-10 bg-blue-600 hover:bg-blue-700"
                  title="Proceed to checkout"
                >
                  Checkout
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}




