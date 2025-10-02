import React, { useEffect, useState } from 'react';
import { 
  Gift, 
  Users, 
  TrendingUp, 
  Plus, 
  Edit, 
  Trash, 
  ToggleLeft, 
  ToggleRight,
  RefreshCw,
  Search,
  Award,
  Coins,
  Calendar,
  Star
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { io, Socket } from 'socket.io-client';
import StaffRewardProcessing from '../staff/StaffRewardProcessing';

interface LoyaltySettings {
  points_per_peso: { value: string; description: string; updated_at: string };
  minimum_points_redemption: { value: string; description: string; updated_at: string };
  loyalty_enabled: { value: string; description: string; updated_at: string };
  rewards_enabled: { value: string; description: string; updated_at: string };
  double_points_days: { value: string; description: string; updated_at: string };
  welcome_points: { value: string; description: string; updated_at: string };
  welcome_points_enabled: { value: string; description: string; updated_at: string };
  points_expiry_months: { value: string; description: string; updated_at: string };
}

interface LoyaltyReward {
  id: number;
  name: string;
  description: string;
  points_required: number;
  reward_type: 'drink' | 'food' | 'discount' | 'upgrade' | 'bonus';
  discount_percentage: number | null;
  is_active: boolean;
  image_url: string | null;
  start_at?: string | null;
  end_at?: string | null;
  created_at: string;
  updated_at: string;
}

interface CustomerLoyalty {
  id: number;
  full_name: string;
  email: string;
  loyalty_points: number;
  created_at: string;
  transaction_count: number;
}

interface LoyaltyStats {
  customers: {
    total_customers: number;
    active_members: number;
    avg_points: number;
    total_points: number;
  };
  transactions: {
    total_transactions: number;
    total_earned: number;
    total_redeemed: number;
    earn_transactions: number;
    redeem_transactions: number;
  };
  monthlyBreakdown: Array<{
    month: string;
    transactions: number;
    earned: number;
    redeemed: number;
  }>;
  topCustomers: Array<{
    full_name: string;
    loyalty_points: number;
    created_at: string;
  }>;
}

const AdminLoyalty: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [customers, setCustomers] = useState<CustomerLoyalty[]>([]);
  const [stats, setStats] = useState<LoyaltyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [editingReward, setEditingReward] = useState<LoyaltyReward | null>(null);
  const [rewardForm, setRewardForm] = useState({
    name: '',
    description: '',
    points_required: '',
    reward_type: 'drink' as 'drink' | 'food' | 'discount' | 'upgrade' | 'bonus',
    discount_percentage: '',
    image_url: '',
    start_at: '',
    end_at: ''
  });
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Initialize Socket.IO connection
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
    const newSocket = io(API_URL);
    setSocket(newSocket);

    // Join admin room for real-time updates
    newSocket.emit('join-admin-room');

    // Listen for real-time updates
    newSocket.on('loyalty-updated', (data) => {
      console.log('Loyalty updated in AdminLoyalty:', data);
      fetchData();
    });

    newSocket.on('order-updated', (data) => {
      console.log('Order updated in AdminLoyalty:', data);
      fetchData();
    });

    fetchData();

    return () => {
      newSocket.close();
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchRewards(),
        fetchCustomers(),
        fetchStats()
      ]);
    } catch (error) {
      console.error('Error fetching loyalty data:', error);
      setError('Failed to load loyalty data');
    } finally {
      setLoading(false);
    }
  };

  const fetchRewards = async () => {
    const res = await fetch('/api/admin/loyalty/rewards');
    if (res.ok) {
      const data = await res.json();
      setRewards(data.rewards);
    }
  };

  const fetchCustomers = async () => {
    const res = await fetch('/api/admin/loyalty/customers');
    if (res.ok) {
      const data = await res.json();
      setCustomers(data.customers);
    }
  };

  const fetchStats = async () => {
    const res = await fetch('/api/admin/loyalty/stats');
    if (res.ok) {
      const data = await res.json();
      setStats(data.stats);
    }
  };

  // Settings UI removed from this page; configuration lives under Admin Settings

  const toggleRewardStatus = async (rewardId: number) => {
    try {
      const res = await fetch(`/api/admin/loyalty/rewards/${rewardId}/toggle`, {
        method: 'PATCH'
      });

      if (res.ok) {
        await fetchRewards();
        setMessage('Reward status updated successfully!');
      } else {
        setError('Failed to update reward status');
      }
    } catch (error) {
      setError('Failed to update reward status');
    }
  };

  const saveReward = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const url = editingReward 
        ? `/api/admin/loyalty/rewards/${editingReward.id}`
        : '/api/admin/loyalty/rewards';
      
      const method = editingReward ? 'PUT' : 'POST';
      const body = {
        ...rewardForm,
        points_required: parseInt(rewardForm.points_required),
        discount_percentage: rewardForm.discount_percentage ? parseFloat(rewardForm.discount_percentage) : null
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setMessage(`Reward ${editingReward ? 'updated' : 'created'} successfully!`);
        setShowRewardModal(false);
        setEditingReward(null);
        resetRewardForm();
        await fetchRewards();
      } else {
        setError(`Failed to ${editingReward ? 'update' : 'create'} reward`);
      }
    } catch (error) {
      setError(`Failed to ${editingReward ? 'update' : 'create'} reward`);
    } finally {
      setSaving(false);
    }
  };

  const deleteReward = async (rewardId: number) => {
    if (!window.confirm('Are you sure you want to delete this reward?')) return;

    try {
      const res = await fetch(`/api/admin/loyalty/rewards/${rewardId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setMessage('Reward deleted successfully!');
        await fetchRewards();
      } else {
        setError('Failed to delete reward');
      }
    } catch (error) {
      setError('Failed to delete reward');
    }
  };

  const editReward = (reward: LoyaltyReward) => {
    setEditingReward(reward);
    setRewardForm({
      name: reward.name,
      description: reward.description,
      points_required: reward.points_required.toString(),
      reward_type: reward.reward_type,
      discount_percentage: reward.discount_percentage?.toString() || '',
      image_url: reward.image_url || '',
      start_at: reward.start_at ? toLocalDatetimeValue(reward.start_at) : '',
      end_at: reward.end_at ? toLocalDatetimeValue(reward.end_at) : ''
    });
    setShowRewardModal(true);
  };

  const resetRewardForm = () => {
    setRewardForm({
      name: '',
      description: '',
      points_required: '',
      reward_type: 'drink' as 'drink' | 'food' | 'discount' | 'upgrade' | 'bonus',
      discount_percentage: '',
      image_url: '',
      start_at: '',
      end_at: ''
    });
  };

  function toLocalDatetimeValue(isoString: string) {
    try {
      const d = new Date(isoString);
      const pad = (n: number) => String(n).padStart(2, '0');
      const yyyy = d.getFullYear();
      const mm = pad(d.getMonth() + 1);
      const dd = pad(d.getDate());
      const hh = pad(d.getHours());
      const mi = pad(d.getMinutes());
      return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
    } catch {
      return '';
    }
  }

  const getRewardTypeBadge = (type: string) => {
    const colors = {
      drink: 'bg-blue-100 text-blue-800 border-blue-200',
      food: 'bg-green-100 text-green-800 border-green-200',
      discount: 'bg-purple-100 text-purple-800 border-purple-200',
      upgrade: 'bg-orange-100 text-orange-800 border-orange-200',
      bonus: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };
    return <Badge className={colors[type as keyof typeof colors]}>{type}</Badge>;
  };

  const filteredCustomers = customers.filter(customer =>
    customer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }



  return (
    <div className="space-y-4 sm:space-y-6 mx-2 sm:mx-4 lg:mx-6 p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Loyalty Program</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage customer rewards and loyalty points system</p>
        </div>
        <Button 
          onClick={fetchData}
          className="bg-amber-600 hover:bg-amber-700 text-white shadow-lg"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            <strong>Error:</strong> {error}
          </div>
        )}
        {message && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
            <strong>Success:</strong> {message}
          </div>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full flex flex-wrap items-center justify-start gap-1 bg-transparent p-0">
            <TabsTrigger value="overview" className="px-3 py-1 text-sm font-medium rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border hover:bg-gray-100">
              <TrendingUp className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="rewards" className="px-3 py-1 text-sm font-medium rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border hover:bg-gray-100">
              <Gift className="w-4 h-4 mr-2" />
              Rewards
            </TabsTrigger>
            <TabsTrigger value="customers" className="px-3 py-1 text-sm font-medium rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border hover:bg-gray-100">
              <Users className="w-4 h-4 mr-2" />
              Customers
            </TabsTrigger>
            <TabsTrigger value="processing" className="px-3 py-1 text-sm font-medium rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border hover:bg-gray-100">
              <Gift className="w-4 h-4 mr-2" />
              Reward Processing
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {stats && (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                    <div className="flex items-center">
                      <div className="p-3 bg-blue-100 rounded-xl">
                        <Users className="h-8 w-8 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Active Members</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.customers.active_members}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                    <div className="flex items-center">
                      <div className="p-3 bg-green-100 rounded-xl">
                        <Coins className="h-8 w-8 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Points</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.customers.total_points.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                    <div className="flex items-center">
                      <div className="p-3 bg-purple-100 rounded-xl">
                        <TrendingUp className="h-8 w-8 text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Avg Points</p>
                        <p className="text-2xl font-bold text-gray-900">{Math.round(stats.customers.avg_points)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                    <div className="flex items-center">
                      <div className="p-3 bg-orange-100 rounded-xl">
                        <Award className="h-8 w-8 text-orange-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Transactions</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.transactions.total_transactions}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Customers */}
                <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Loyalty Members</h2>
                  <div className="space-y-3">
                    {stats.topCustomers.map((customer, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white/50 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center mr-3">
                            <Star className="w-4 h-4 text-amber-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{customer.full_name}</p>
                            <p className="text-sm text-gray-600">
                              Member since {new Date(customer.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                          {customer.loyalty_points} points
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          

          {/* Rewards Tab */}
          <TabsContent value="rewards" className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Loyalty Rewards</h2>
                <Button 
                  onClick={() => {
                    setEditingReward(null);
                    resetRewardForm();
                    setShowRewardModal(true);
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white shadow-lg"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Reward
                </Button>
              </div>

              {rewards.length === 0 ? (
                <div className="text-center py-12">
                  <Gift className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Rewards Created Yet</h3>
                  <p className="text-gray-600 mb-6">
                    Start building your loyalty program by creating your first reward. 
                    Customers will be able to redeem points for these rewards.
                  </p>
                  <Button 
                    onClick={() => {
                      setEditingReward(null);
                      resetRewardForm();
                      setShowRewardModal(true);
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white shadow-lg"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Reward
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rewards.map((reward) => (
                    <div key={reward.id} className="bg-white/60 backdrop-blur-sm rounded-xl p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 border border-white/20">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">{reward.name}</h3>
                          <p className="text-sm text-gray-600">{reward.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getRewardTypeBadge(reward.reward_type)}
                          <Badge className={reward.is_active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}>
                            {reward.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Points Required:</span>
                          <span className="font-medium">{reward.points_required}</span>
                        </div>
                        {reward.discount_percentage && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Discount:</span>
                            <span className="font-medium">{reward.discount_percentage}%</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => editReward(reward)}
                          className="bg-white/50 backdrop-blur-sm border-white/20 hover:bg-white/70"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleRewardStatus(reward.id)}
                          className={reward.is_active ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'}
                        >
                          {reward.is_active ? 'Disable' : 'Enable'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteReward(reward.id)}
                          className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers" className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Customer Loyalty</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Customer</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Email</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Points</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Transactions</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Member Since</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((customer) => (
                      <tr key={customer.id} className="border-b border-white/20 hover:bg-white/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-900">{customer.full_name}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-gray-700">{customer.email}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                            {customer.loyalty_points} points
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-gray-700">{customer.transaction_count}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-gray-700">
                            {new Date(customer.created_at).toLocaleDateString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Reward Processing Tab */}
          <TabsContent value="processing" className="space-y-6">
            <StaffRewardProcessing />
          </TabsContent>
        </Tabs>

        {/* Reward Modal */}
        {showRewardModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-md border border-white/20">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingReward ? 'Edit Reward' : 'Create New Reward'}
                </h2>
                <button
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                  onClick={() => setShowRewardModal(false)}
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={saveReward} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reward Name</label>
                  <Input
                    value={rewardForm.name}
                    onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })}
                    placeholder="e.g., Free Coffee"
                    required
                    className="bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <Input
                    value={rewardForm.description}
                    onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })}
                    placeholder="e.g., Redeem for any coffee drink"
                    required
                    className="bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Points Required</label>
                  <Input
                    type="number"
                    value={rewardForm.points_required}
                    onChange={(e) => setRewardForm({ ...rewardForm, points_required: e.target.value })}
                    placeholder="50"
                    required
                    min="1"
                    className="bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reward Type</label>
                  <select
                    value={rewardForm.reward_type}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === 'drink' || value === 'food' || value === 'discount' || value === 'upgrade' || value === 'bonus') {
                        setRewardForm({ ...rewardForm, reward_type: value });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    aria-label="Select reward type"
                  >
                    <option value="drink">Drink</option>
                    <option value="food">Food</option>
                    <option value="discount">Discount</option>
                    <option value="upgrade">Upgrade</option>
                    <option value="bonus">Bonus</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Percentage</label>
                  <Input
                    type="number"
                    value={rewardForm.discount_percentage}
                    onChange={(e) => setRewardForm({ ...rewardForm, discount_percentage: e.target.value })}
                    placeholder="e.g., 20"
                    min="0"
                    max="100"
                    step="0.1"
                    className="bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                  <Input
                    value={rewardForm.image_url}
                    onChange={(e) => setRewardForm({ ...rewardForm, image_url: e.target.value })}
                    placeholder="e.g., https://example.com/image.jpg"
                    className="bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date & Time</label>
                    <input
                      type="datetime-local"
                      value={rewardForm.start_at}
                      onChange={(e) => setRewardForm({ ...rewardForm, start_at: e.target.value })}
                      placeholder="Select start date and time"
                      aria-label="Start date and time"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-amber-600 bg-white/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date & Time</label>
                    <input
                      type="datetime-local"
                      value={rewardForm.end_at}
                      onChange={(e) => setRewardForm({ ...rewardForm, end_at: e.target.value })}
                      placeholder="Select expiry date and time"
                      aria-label="Expiry date and time"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-amber-600 bg-white/50"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? 'Saving...' : (editingReward ? 'Update Reward' : 'Create Reward')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRewardModal(false)}
                    className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Error and Success Messages */}
        {error && (
          <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
            <span className="block sm:inline">{error}</span>
            <button
              className="absolute top-0 bottom-0 right-0 px-4 py-3"
              onClick={() => setError(null)}
            >
              <span className="sr-only">Dismiss</span>
              ×
            </button>
          </div>
        )}

        {message && (
          <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50">
            <span className="block sm:inline">{message}</span>
            <button
              className="absolute top-0 bottom-0 right-0 px-4 py-3"
              onClick={() => setMessage(null)}
            >
              <span className="sr-only">Dismiss</span>
              ×
            </button>
          </div>
        )}
    </div>
  );
};

export default AdminLoyalty;