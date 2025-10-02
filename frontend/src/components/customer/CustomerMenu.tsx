import React, { useState, useEffect } from 'react';
import MenuItem from '../MenuItem';
import CustomerCartModal from './CustomerCartModal';
import UnifiedCustomizeModal from './UnifiedCustomizeModal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { 
  Search, 
  Filter, 
  Coffee, 
  RefreshCw,
  AlertCircle,
  ShoppingCart
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from './AuthContext';

interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url?: string;
  is_available: boolean;
}

const CustomerMenu: React.FC = () => {
  const { addToCart, isCartModalOpen, closeCartModal, openCartModal, items: cartContextItems, updateQuantity, updateNotes, removeItem, clearCart } = useCart();
  const { user } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [customizationModal, setCustomizationModal] = useState<{ isOpen: boolean; item: any | null }>({ isOpen: false, item: null });
  const [socket, setSocket] = useState<Socket | null>(null);

  // Try to open GCash/PayMaya app via deep links with fallbacks
  const openDigitalWalletApp = (method: 'gcash' | 'paymaya') => {
    const scheme = method === 'gcash' ? 'gcash://' : 'paymaya://';
    const androidPackage = method === 'gcash' ? 'com.globe.gcash.android' : 'com.paymaya';
    const playStore = method === 'gcash'
      ? 'https://play.google.com/store/apps/details?id=com.globe.gcash.android'
      : 'https://play.google.com/store/apps/details?id=com.paymaya';
    const appStore = method === 'gcash'
      ? 'https://apps.apple.com/app/gcash/id520020791'
      : 'https://apps.apple.com/app/paymaya/id991673877';

    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    const tryOpen = (url: string) => {
      window.location.href = url;
    };

    if (isAndroid) {
      tryOpen(scheme);
      setTimeout(() => {
        if (!document.hidden) {
          tryOpen(`intent://open#Intent;scheme=${scheme.replace('://','')};package=${androidPackage};end`);
        }
      }, 800);
      setTimeout(() => {
        if (!document.hidden) window.open(playStore, '_blank');
      }, 1600);
    } else if (isIOS) {
      tryOpen(scheme);
      setTimeout(() => {
        if (!document.hidden) window.open(appStore, '_blank');
      }, 1200);
    } else {
      window.open(method === 'gcash' ? 'https://www.gcash.com/' : 'https://www.paymaya.com/', '_blank');
    }
  };

  // Post-order wallet prompt (to satisfy browser user-gesture requirements)
  const [walletPrompt, setWalletPrompt] = useState<{isOpen: boolean; method: 'gcash' | 'paymaya' | null; orderId: string; amount: number}>({
    isOpen: false,
    method: null,
    orderId: '',
    amount: 0
  });

  // Upload receipt function
  const uploadReceipt = async (receiptFile: File, orderId: string) => {
    try {
      const formData = new FormData();
      formData.append('receipt', receiptFile);
      formData.append('orderId', orderId);

      const response = await fetch(`${window.location.origin.replace(':5173', ':5001')}/api/customer/upload-receipt`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        alert(`Receipt uploaded successfully! Your payment is being verified. Order ID: ${orderId}`);
      } else {
        alert(`Failed to upload receipt: ${result.message}`);
      }
    } catch (error) {
      console.error('Receipt upload error:', error);
      alert('Failed to upload receipt. Please try again.');
    }
  };

  // Fetch menu data via AJAX
  const fetchMenuData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${window.location.origin.replace(':5173', ':5001')}/api/customer/menu`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch menu data');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Map the data to ensure price is a number
        const processedMenuItems = data.menu_items.map((item: any) => ({
          ...item,
          price: parseFloat(item.base_price || item.price) || 0,
          description: item.description || '',
          image_url: item.image_url || null
        }));
        
        setMenuItems(processedMenuItems);
        setFilteredItems(processedMenuItems);
        
        // Extract unique categories
        const uniqueCategories = processedMenuItems
          .map((item: MenuItem) => item.category)
          .filter(Boolean) as string[];
        setCategories([...new Set(uniqueCategories)]);
      } else {
        throw new Error(data.error || 'Failed to load menu');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories separately
  const fetchCategories = async () => {
    try {
      const response = await fetch(`${window.location.origin.replace(':5173', ':5001')}/api/menu/categories`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCategories(data.categories || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  // Initial data fetch and WebSocket setup
  useEffect(() => {
    // Initialize Socket.IO connection
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
    const newSocket = io(API_URL);
    setSocket(newSocket);

    // Join customer room for real-time updates
    newSocket.emit('join-customer-room', { customerEmail: user?.email });

    // Listen for real-time updates
    newSocket.on('menu-updated', (data) => {
      console.log('Menu updated in CustomerMenu:', data);
      fetchMenuData();
    });

    newSocket.on('inventory-updated', (data) => {
      console.log('Inventory updated in CustomerMenu:', data);
      fetchMenuData();
    });

    fetchMenuData();
    fetchCategories();

    return () => {
      newSocket.close();
    };
  }, [user?.email]);

  // Filter and sort items when search/category/sort changes
  useEffect(() => {
    let filtered = [...menuItems];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Sort items
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'category':
          return a.category.localeCompare(b.category);
        default:
          return 0;
      }
    });

    setFilteredItems(filtered);
  }, [menuItems, searchTerm, selectedCategory, sortBy]);

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Handle category selection
  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
  };

  // Handle sort change
  const handleSortChange = (value: string) => {
    setSortBy(value);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSortBy('name');
  };

  // Handle manual refresh
  const handleRefresh = () => {
    fetchMenuData();
  };

  // Handle add to cart
  const handleAddToCart = (item: any) => {
    // Show warning if no table access but still allow adding to cart
    if (!hasValidTableAccess) {
      console.warn('No table access detected. Order may not be processed correctly.');
    }

    if (item.customization) {
      setCustomizationModal({ isOpen: true, item: item });
    } else {
      addToCart({
        id: item.id.toString(),
        name: item.name,
        price: item.price,
        quantity: 1
      });
    }
  };

  if (loading && menuItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Loading menu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchMenuData} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const totalItems = menuItems.length;
  const availableItems = menuItems.filter(item => item.is_available).length;
  const popularItems = menuItems.filter(item => item.is_available).length; // You can add popularity logic later
  const totalCategories = categories.length;

  // Get table number from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const tableFromUrl = urlParams.get('table');
  const tableNumber = tableFromUrl ? parseInt(tableFromUrl) : null;
  
  // Check if user has valid table access (1-6)
  const hasValidTableAccess = tableNumber && tableNumber >= 1 && tableNumber <= 6;

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="space-y-4 sm:space-y-6 mx-2 sm:mx-4 lg:mx-6 pt-4">
        {/* Header */}
        <div className="space-y-4 sm:space-y-6 px-2 sm:px-4 lg:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Menu</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Explore our delicious selection of coffee and beverages</p>
          </div>
        </div>
        
        {/* Table Number Display */}
        {hasValidTableAccess && (
          <div className="mt-4 inline-flex items-center px-4 py-2 bg-[#a87437] text-white rounded-lg shadow-md">
            <span className="text-sm font-medium">Table {tableNumber}</span>
            <div className="ml-2 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          </div>
        )}
        
        {/* Warning for users without table access */}
        {!hasValidTableAccess && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Table Access Required
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>To place an order, please scan the QR code on your table. You can still browse our menu, but ordering requires table access.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search menu items..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-12 h-12 text-lg border-2 border-[#a87437] rounded-xl focus:border-[#a87437] focus:ring-2 focus:ring-[#a87437]/20"
            />
          </div>

          {/* Category Filter */}
          <Select value={selectedCategory} onValueChange={handleCategoryChange}>
            <SelectTrigger className="h-12 border-2 border-[#a87437] rounded-xl focus:border-[#a87437] focus:ring-2 focus:ring-[#a87437]/20">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View Toggle Buttons */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              className="h-12 w-12 border-2 border-[#a87437] rounded-xl hover:bg-[#a87437]/5"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="h-12 w-12 border-2 border-[#a87437] rounded-xl hover:bg-[#a87437]/5"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </Button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-2 border-[#a87437] shadow-xl hover:shadow-2xl transition-shadow duration-300">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-[#6B5B5B] mb-2">{totalItems}</div>
            <div className="text-sm text-[#6B5B5B]">Total Items</div>
          </CardContent>
        </Card>
        <Card className="border-2 border-green-500 shadow-xl hover:shadow-2xl transition-shadow duration-300">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">{availableItems}</div>
            <div className="text-sm text-[#6B5B5B]">Available Items</div>
          </CardContent>
        </Card>
        <Card className="border-2 border-purple-500 shadow-xl hover:shadow-2xl transition-shadow duration-300">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">{popularItems}</div>
            <div className="text-sm text-[#6B5B5B]">Popular</div>
          </CardContent>
        </Card>
        <Card className="border-2 border-blue-500 shadow-xl hover:shadow-2xl transition-shadow duration-300">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">{totalCategories}</div>
            <div className="text-sm text-[#6B5B5B]">Categories</div>
          </CardContent>
        </Card>
      </div>

      {/* Menu Items by Category */}
      {filteredItems.length === 0 ? (
        <Card className="border-2 border-[#a87437] shadow-xl">
          <CardContent className="text-center py-16">
            <Coffee className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[#6B5B5B] mb-2">No items found</h3>
            <p className="text-gray-500 mb-4">
              Try adjusting your search or filters
            </p>
            <Button 
              onClick={clearFilters} 
              variant="outline"
              className="border-2 border-[#a87437]/30 hover:bg-[#a87437]/5"
            >
              Clear All Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {(() => {
            // Group items by category
            const groupedItems = filteredItems.reduce((acc, item) => {
              const category = item.category || 'Other';
              if (!acc[category]) {
                acc[category] = [];
              }
              acc[category].push(item);
              return acc;
            }, {} as Record<string, MenuItem[]>);

            return Object.entries(groupedItems).map(([category, items]) => (
              <div key={category} className="space-y-4">
                {/* Category Header */}
                <h2 className="text-2xl font-bold text-[#a87437] border-b-2 border-[#a87437]/30 pb-2">
                  {category}
                </h2>
                
                {/* Items List - Single Column Layout */}
                <div className="space-y-4">
                  {items.map((item) => (
                    <MenuItem
                      key={item.id}
                      item={item}
                      onAddToCart={handleAddToCart}
                      hasTableAccess={hasValidTableAccess}
                    />
                  ))}
                </div>
              </div>
            ));
          })()}
        </div>
      )}



      {/* Cart Modal */}
      <CustomerCartModal 
        isOpen={isCartModalOpen}
        cart={cartContextItems.map(item => ({
          id: parseInt(item.id),
          name: item.name,
          base_price: item.price,
          cartItemId: item.id,
          quantity: item.quantity,
          notes: item.notes,
          customizations: item.customizations,
          customPrice: item.customPrice
        }))}
        onClose={closeCartModal}
        onUpdateQuantity={updateQuantity}
        onUpdateNotes={(cartItemId, notes) => {
          updateNotes(cartItemId, notes);
        }}
        onRemove={removeItem}
        onClear={clearCart}
        onCheckout={async (paymentMethod) => {
          try {
            // Check if user is authenticated
            if (!user || !user.email) {
              // Redirect to login with table parameter preserved
              const urlParams = new URLSearchParams(window.location.search);
              const tableFromUrl = urlParams.get('table');
              const loginUrl = tableFromUrl ? `/login?table=${tableFromUrl}` : '/login';
              
              alert('Please log in to place an order. You will be redirected to the login page.');
              window.location.href = loginUrl;
              return;
            }

            // Get table number from URL parameter
            const urlParams = new URLSearchParams(window.location.search);
            const tableFromUrl = urlParams.get('table');
            const tableNumber = tableFromUrl ? parseInt(tableFromUrl) : null;

            // Prepare order data
              const notesList = cartContextItems.map(item => item.notes).filter(Boolean) as string[];
              const orderLevelNotes = notesList.length ? notesList[notesList.length - 1] : '';

              const orderData = {
              customerId: user.id, // Add customer ID for loyalty points and order tracking
              customerName: user.name || 'Customer',
              customerEmail: user.email,
              items: cartContextItems.map(item => ({
                menuItemId: parseInt(item.id), // Changed from 'id' to 'menuItemId' to match backend expectation
                name: item.name,
                quantity: item.quantity,
                price: item.customPrice || item.price,
                notes: item.notes,
                customizations: item.customizations
              })),
              totalAmount: cartContextItems.reduce((sum, item) => sum + (item.customPrice || item.price) * item.quantity, 0),
              paymentMethod: paymentMethod,
                notes: orderLevelNotes,
              tableNumber: tableNumber
            };

            // For digital payments, create order then deep-link to wallet app
            if (paymentMethod === 'gcash' || paymentMethod === 'paymaya') {
              console.log('Digital payment selected:', paymentMethod);

              const response = await fetch(`${window.location.origin.replace(':5173', ':5001')}/api/customer/checkout`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(orderData),
              });

              const result = await response.json();
              console.log('Order creation result:', result);

              if (result.success) {
                // Clear cart and close modal first
                clearCart();
                closeCartModal();
                // Show explicit prompt with a button (user gesture) to open the app
                setWalletPrompt({
                  isOpen: true,
                  method: paymentMethod,
                  orderId: result.orderId,
                  amount: orderData.totalAmount
                });
              } else {
                alert(`Failed to place order: ${result.message}`);
              }
            } else {
              // For cash payments, proceed normally
              const response = await fetch(`${window.location.origin.replace(':5173', ':5001')}/api/customer/checkout`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(orderData),
              });

              const result = await response.json();

              if (result.success) {
                clearCart();
                closeCartModal();
                alert(`Order placed successfully! Order ID: ${result.orderId}`);
                
                // Add a small delay to ensure backend status update is processed
                setTimeout(() => {
                  // Trigger a refresh of orders if we're on the orders page
                  if (window.location.pathname.includes('/customer/orders')) {
                    window.location.reload();
                  }
                }, 500);
              } else {
                alert(`Failed to place order: ${result.message}`);
              }
            }
          } catch (error) {
            console.error('Checkout error:', error);
            alert('Failed to place order. Please try again.');
          }
        }}
        user={user}
        hasTableAccess={hasValidTableAccess}
      />

      {/* Customization Modal */}
      {customizationModal.isOpen && customizationModal.item && (
        <UnifiedCustomizeModal
          item={customizationModal.item}
          onClose={() => setCustomizationModal({ isOpen: false, item: null })}
          onAdd={(customizedItem: any) => {
            addToCart({
              id: customizedItem.id || customizationModal.item.id.toString(),
              name: customizedItem.name || customizationModal.item.name,
              price: customizedItem.price || customizedItem.price,
              quantity: 1,
              notes: customizedItem.instructions || 'Customized',
              customizations: customizedItem.customizations || { customized: true }
            });
            setCustomizationModal({ isOpen: false, item: null });
          }}
        />
      )}

      {/* Wallet App Prompt Modal */}
      {walletPrompt.isOpen && walletPrompt.method && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Open {walletPrompt.method.toUpperCase()}</h3>
            <p className="text-sm text-gray-700 mb-4">
              Order ID: {walletPrompt.orderId}
            </p>
            <p className="text-sm text-gray-600 mb-6">
              Tap the button below to open the {walletPrompt.method.toUpperCase()} app and complete your payment.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => openDigitalWalletApp(walletPrompt.method as 'gcash' | 'paymaya')}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Open {walletPrompt.method.toUpperCase()}
              </button>
              <button
                onClick={() => setWalletPrompt({ isOpen: false, method: null, orderId: '', amount: 0 })}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      </div>
    </div>
  );
};

export default CustomerMenu;