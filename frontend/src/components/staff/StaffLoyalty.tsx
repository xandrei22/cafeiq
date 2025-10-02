import React, { useEffect, useState } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { RefreshCw } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

interface CustomerInfo {
  id: number;
  name: string;
  points: number;
  memberSince: string;
}

interface Transaction {
  id: number;
  transaction_type: 'earn' | 'redeem' | 'adjustment';
  points_earned: number;
  points_redeemed: number;
  description: string;
  created_at: string;
}

const StaffLoyalty: React.FC = () => {
  const [customerId, setCustomerId] = useState('');
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [redeemPoints, setRedeemPoints] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [error, setError] = useState<string | null>(null);

  // New: processing states for reward usage confirmation
  const [staffId, setStaffId] = useState('');
  const [redemptionId, setRedemptionId] = useState('');
  const [usageType, setUsageType] = useState<'free_item' | 'discount' | 'other'>('free_item');
  const [menuItemId, setMenuItemId] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [confirmNotes, setConfirmNotes] = useState('');

  const loadCustomer = async () => {
    setError(null);
    setMessage(null);
    setCustomer(null);
    setRecent([]);
    if (!customerId.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/loyalty/points/${encodeURIComponent(customerId.trim())}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to fetch customer');
        return;
      }
      setCustomer(data.customer);
      setRecent(data.recentTransactions || []);
    } catch (e) {
      setError('Network error while loading customer');
    } finally {
      setLoading(false);
    }
  };

  const redeem = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!customer) return;
    const pointsToRedeem = parseInt(redeemPoints, 10);
    if (isNaN(pointsToRedeem) || pointsToRedeem <= 0) {
      setError('Enter a valid number of points');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/loyalty/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          customerId: customer.id,
          pointsToRedeem,
          redemptionType: 'staff_deduction',
          description: note || 'Redeemed by staff at counter'
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to redeem points');
        return;
      }
      setMessage(data.message || 'Points redeemed');
      setRedeemPoints('');
      setNote('');
      await loadCustomer();
    } catch (e) {
      setError('Network error while redeeming');
    } finally {
      setLoading(false);
    }
  };

  // New: confirm reward usage (staff)
  const confirmRewardUsage = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!redemptionId.trim() || !staffId.trim() || !usageType) {
      setError('Please provide redemption ID, usage type, and your staff ID.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/loyalty/confirm-reward-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          redemptionId: parseInt(redemptionId, 10),
          staffId: parseInt(staffId, 10),
          usageType,
          menuItemId: menuItemId ? parseInt(menuItemId, 10) : null,
          discountAmount: discountAmount ? parseFloat(discountAmount) : null,
          confirmationNotes: confirmNotes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to confirm reward usage');
        return;
      }
      setMessage(data.message || 'Reward usage confirmed');
      setRedemptionId('');
      setMenuItemId('');
      setDiscountAmount('');
      setConfirmNotes('');
      // Refresh customer info if we have it (points/transactions may update)
      if (customerId) await loadCustomer();
    } catch (e) {
      setError('Network error while confirming reward usage');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initialize Socket.IO connection
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
    const newSocket = io(API_URL);
    setSocket(newSocket);

    // Join staff room for real-time updates
    newSocket.emit('join-staff-room');

    // Listen for real-time updates
    newSocket.on('loyalty-updated', (data) => {
      console.log('Loyalty updated in StaffLoyalty:', data);
      if (customerId) {
        loadCustomer();
      }
    });

    newSocket.on('order-updated', (data) => {
      console.log('Order updated in StaffLoyalty:', data);
      if (customerId) {
        loadCustomer();
      }
    });

    // Auto-load if an ID is prefilled (e.g., via navigation state/QR later)
    if (customerId) {
      loadCustomer();
    }

    return () => {
      newSocket.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f5f5] p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-[#f5f5f5] rounded-2xl border border-white/20 p-6">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer ID</label>
              <Input
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                placeholder="Enter customer ID"
                className="bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70"
              />
            </div>
            <Button onClick={loadCustomer} className="bg-amber-600 hover:bg-amber-700 text-white">
              <RefreshCw className="w-4 h-4 mr-2" />
              Load
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">{error}</div>
        )}
        {message && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">{message}</div>
        )}

        {/* New: Process Reward Usage Section */}
        <div className="bg-[#f5f5f5] rounded-2xl border border-white/20 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Process Reward Usage</h2>
          <form onSubmit={confirmRewardUsage} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Redemption ID</label>
              <Input
                value={redemptionId}
                onChange={(e) => setRedemptionId(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="e.g., 123"
                className="bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Usage Type</label>
              <select
                value={usageType}
                onChange={(e) => setUsageType(e.target.value as any)}
                className="border rounded-md px-3 py-2 w-full"
                aria-label="Usage type"
              >
                <option value="free_item">Free Item</option>
                <option value="discount">Discount</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Staff ID</label>
              <Input
                value={staffId}
                onChange={(e) => setStaffId(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Your staff ID"
                className="bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Menu Item ID (optional)</label>
              <Input
                value={menuItemId}
                onChange={(e) => setMenuItemId(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Menu item for free item rewards"
                className="bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount Amount (optional)</label>
              <Input
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder="e.g., 20.00"
                className="bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmation Notes (optional)</label>
              <Input
                value={confirmNotes}
                onChange={(e) => setConfirmNotes(e.target.value)}
                placeholder="Any additional info"
                className="bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70"
              />
            </div>
            <div className="md:col-span-3">
              <Button type="submit" disabled={loading} className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                {loading ? 'Processing...' : 'Confirm Reward Usage'}
              </Button>
            </div>
          </form>
        </div>

        {customer && (
          <div className="bg-[#f5f5f5] rounded-2xl border border-white/20 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-gray-900">{customer.name}</p>
                <p className="text-sm text-gray-600">Member since {new Date(customer.memberSince).toLocaleDateString()}</p>
              </div>
              <Badge className="bg-amber-100 text-amber-800 border-amber-200">{customer.points} points</Badge>
            </div>

            <form onSubmit={redeem} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Points to redeem</label>
                <Input
                  type="number"
                  value={redeemPoints}
                  onChange={(e) => setRedeemPoints(e.target.value.replace(/[^0-9]/g, ''))}
                  min={1}
                  className="bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70"
                  placeholder="e.g., 10"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Reason / description"
                  className="bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70"
                />
              </div>
              <div className="md:col-span-3">
                <Button type="submit" disabled={loading} className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                  {loading ? 'Processing...' : 'Redeem / Deduct Points'}
                </Button>
              </div>
            </form>

            <div>
              <h3 className="text-md font-semibold text-gray-900 mb-3">Recent transactions</h3>
              {recent.length === 0 ? (
                <p className="text-sm text-gray-600">No recent transactions</p>
              ) : (
                <div className="space-y-2">
                  {recent.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between p-3 bg-white/60 rounded-lg border border-white/20">
                      <div>
                        <p className="text-sm text-gray-900">{tx.description}</p>
                        <p className="text-xs text-gray-600">{new Date(tx.created_at).toLocaleString()}</p>
                      </div>
                      <Badge className={tx.transaction_type === 'redeem' || tx.points_redeemed > 0 ? 'bg-red-100 text-red-700 border-red-200' : 'bg-green-100 text-green-700 border-green-200'}>
                        {tx.transaction_type === 'redeem' || tx.points_redeemed > 0 ? `-${tx.points_redeemed}` : `+${tx.points_earned}`}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffLoyalty;
