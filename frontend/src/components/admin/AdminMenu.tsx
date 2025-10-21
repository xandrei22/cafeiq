import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  ShoppingCart,
  Users
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import ProductDetailsForm from './ProductDetailsForm';

interface MenuItem {
  id: number;
  name: string;
  description: string;
  category: string;
  base_price: number;
  is_available: boolean;
  visible_in_pos: boolean;
  visible_in_customer_menu: boolean;
  created_at: string;
  ingredients?: Array<{
    ingredient_id: number;
    base_quantity: number;
    base_unit: string;
    actual_quantity: number;
    inventory_unit: string;
    ingredient_name: string;
    is_optional: boolean;
  }>;
}

const AdminMenu: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const API_URL = '';

  useEffect(() => {
    // Initialize Socket.IO connection
    const newSocket = io();
    setSocket(newSocket);

    // Join admin room for real-time updates
    newSocket.emit('join-admin-room');

    // Listen for real-time updates
    newSocket.on('menu-updated', (data) => {
      console.log('Menu updated in AdminMenu:', data);
      loadMenuItems();
    });

    newSocket.on('inventory-updated', (data) => {
      console.log('Inventory updated in AdminMenu:', data);
      loadMenuItems();
    });

    loadMenuItems();

    return () => {
      newSocket.close();
    };
  }, []);

  const loadMenuItems = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/menu', { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        // Ensure proper type conversion for numeric fields
        const processedItems = data.menuItems.map((item: any) => ({
          ...item,
          base_price: Number(item.base_price),
          is_available: Boolean(item.is_available),
          visible_in_pos: Boolean(item.visible_in_pos),
          visible_in_customer_menu: Boolean(item.visible_in_customer_menu)
        }));
        setMenuItems(processedItems);
      }
    } catch (error) {
      console.error('Failed to load menu items:', error);
    } finally {
      setLoading(false);
    }
  };

  // Derived values for filtering and categories
  const categories = Array.from(new Set(menuItems.map(i => i.category).filter(Boolean))) as string[];
  const filteredItems = menuItems
    .filter(i => selectedCategory === 'all' || i.category === selectedCategory)
    .filter(i =>
      [i.name, i.description, i.category]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );

  const handleSave = async (productData: any) => {
    try {
      const url = editingItem 
        ? `/api/menu/${editingItem.id}`
        : `/api/menu`;
      
      const method = editingItem ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
        credentials: 'include',
      });

      const data = await response.json();
      
      if (data.success) {
        setShowForm(false);
        setEditingItem(null);
        loadMenuItems();
      } else {
        alert('Failed to save menu item: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to save menu item:', error);
      alert('Failed to save menu item');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this menu item?')) {
      return;
    }

    try {
      const response = await fetch(`/api/menu/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();
      
      if (data.success) {
        loadMenuItems();
      } else {
        alert('Failed to delete menu item: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to delete menu item:', error);
      alert('Failed to delete menu item');
    }
  };

  const toggleVisibility = async (id: number, field: 'visible_in_pos' | 'visible_in_customer_menu', value: boolean) => {
    try {
      const response = await fetch(`/api/menu/${id}/visibility`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [field]: value }),
        credentials: 'include',
      });

      const data = await response.json();
      
      if (data.success) {
        loadMenuItems();
      } else {
        alert('Failed to update visibility: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to update visibility:', error);
      alert('Failed to update visibility');
    }
  };

  const openForm = (item?: MenuItem) => {
    setEditingItem(item || null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading menu items...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 mx-2 sm:mx-4 lg:mx-6 p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Manage Menu</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Create and manage your menu items</p>
        </div>
        <Button 
          onClick={() => openForm()} 
          className="bg-amber-700 hover:bg-amber-800 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Menu Item
        </Button>
      </div>

      {/* Filters, Search, View toggle */}
      <div className="rounded-xl bg-[#f5f5f5] p-4">
        <div className="flex flex-wrap items-center justify-end gap-3">
          {/* Search */}
          <div className="relative w-full sm:w-auto sm:min-w-[18rem]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"/></svg>
            <input
              placeholder="Search by name, SKU, category"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 rounded-lg bg-white border border-gray-200 px-3 w-full"
            />
          </div>

          {/* Category Filter */}
          <div className="w-full sm:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-10 rounded-lg bg-white border border-gray-200 px-3"
              aria-label="Filter by category"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* View Toggle */}
          <div className="w-full sm:w-auto flex sm:justify-end">
            <div className="inline-flex rounded-md overflow-hidden border bg-white">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 flex items-center gap-2 ${viewMode === 'grid' ? 'bg-gray-100' : ''}`}
                aria-label="Grid view"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h4v4H4V6zm6 0h4v4h-4V6zm6 0h4v4h-4V6zM4 12h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z"/></svg>
                Grid
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 flex items-center gap-2 border-l ${viewMode === 'list' ? 'bg-gray-100' : ''}`}
                aria-label="List view"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
                List
              </button>
            </div>
          </div>
        </div>
      </div>

      {viewMode === 'grid' && (
      <>
      {menuItems.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-gray-500">
              <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No menu items yet</h3>
              <p className="text-sm">Create your first menu item to get started</p>
            </div>
          </CardContent>
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-gray-500">
              <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No menu items found</h3>
              <p className="text-sm">Try adjusting your search or category filter</p>
            </div>
          </CardContent>
        </Card>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {filteredItems.map((item) => (
          <Card key={item.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-start justify-between gap-4 w-full">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 aspect-square">
                    {item.image_url ? (
                      <img
                        src={item.image_url.startsWith('http') ? item.image_url : item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          console.error('Image failed to load:', item.image_url);
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-full h-full bg-gray-200 flex items-center justify-center ${item.image_url ? 'hidden' : ''}`}>
                      <i className="fas fa-image text-gray-400 text-xl"></i>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg sm:text-xl truncate">{item.name}</CardTitle>
                    <p className="text-gray-600 mt-1 line-clamp-2">{item.description}</p>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3">
                      <Badge variant="outline" className="text-sm">
                        {item.category}
                      </Badge>
                      <span className="text-base sm:text-lg font-semibold text-amber-700">
                        ₱{Number(item.base_price).toFixed(2)}
                      </span>
                      <Badge 
                        variant={item.is_available ? "default" : "secondary"}
                        className="text-sm"
                      >
                        {item.is_available ? 'Available' : 'Unavailable'}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 sm:ml-0 justify-start shrink-0 w-full sm:basis-full">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleVisibility(item.id, 'visible_in_pos', !item.visible_in_pos)}
                    className={`flex items-center gap-1 ${
                      item.visible_in_pos ? 'text-green-600 border-green-600' : 'text-gray-400 border-gray-400'
                    }`}
                  >
                    {item.visible_in_pos ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    <ShoppingCart className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleVisibility(item.id, 'visible_in_customer_menu', !item.visible_in_customer_menu)}
                    className={`flex items-center gap-1 ${
                      item.visible_in_customer_menu ? 'text-blue-600 border-blue-600' : 'text-gray-400 border-gray-400'
                    }`}
                  >
                    {item.visible_in_customer_menu ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    <Users className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openForm(item)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(item.id)}
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
      )}
      </>
      )}

      {viewMode === 'list' && (
        menuItems.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-gray-500">
                <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No menu items yet</h3>
                <p className="text-sm">Create your first menu item to get started</p>
              </div>
            </CardContent>
          </Card>
        ) : filteredItems.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-gray-500">
                <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No menu items found</h3>
                <p className="text-sm">Try adjusting your search or category filter</p>
              </div>
            </CardContent>
          </Card>
        ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="min-w-full text-xs table-fixed">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left pl-6 pr-3 py-2">Image</th>
                <th className="text-left px-3 py-2">Name</th>
                <th className="text-left px-3 py-2">Category</th>
                <th className="text-left px-3 py-2">Description</th>
                <th className="text-left px-3 py-2">Price</th>
                <th className="text-center px-3 py-2 w-28">POS</th>
                <th className="text-center px-3 py-2 w-40">Customer Menu</th>
                <th className="text-center px-3 py-2 w-28">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="pl-6 pr-3 py-1 text-gray-600 truncate max-w-[16rem]" title={item.image_url || 'No image'}>
                    {item.image_url ? item.image_url : 'No image'}
                  </td>
                  <td className="px-3 py-1 font-medium truncate max-w-[12rem]">{item.name}</td>
                  <td className="px-3 py-1 truncate whitespace-nowrap">{item.category}</td>
                  <td className="px-3 py-1 text-gray-600 truncate max-w-[22rem]">{item.description}</td>
                  <td className="px-3 py-1 truncate whitespace-nowrap">₱{Number(item.base_price).toFixed(2)}</td>
                  <td className="px-3 py-1 whitespace-nowrap text-center">
                    <button
                      className={`px-2 py-0.5 rounded-md border ${item.visible_in_pos ? 'text-green-600 border-green-500 bg-green-50' : 'text-gray-500 border-gray-300 bg-white'}`}
                      onClick={() => toggleVisibility(item.id, 'visible_in_pos', !item.visible_in_pos)}
                      title="Toggle POS visibility"
                    >
                      {item.visible_in_pos ? 'Visible' : 'Hidden'}
                    </button>
                  </td>
                  <td className="px-3 py-1 whitespace-nowrap text-center">
                    <button
                      className={`px-2 py-0.5 rounded-md border ${item.visible_in_customer_menu ? 'text-blue-600 border-blue-500 bg-blue-50' : 'text-gray-500 border-gray-300 bg-white'}`}
                      onClick={() => toggleVisibility(item.id, 'visible_in_customer_menu', !item.visible_in_customer_menu)}
                      title="Toggle customer menu visibility"
                    >
                      {item.visible_in_customer_menu ? 'Visible' : 'Hidden'}
                    </button>
                  </td>
                  <td className="px-3 py-1 text-center whitespace-nowrap">
                    <div className="inline-flex gap-1 justify-center">
                      <button
                        className="p-1.5 rounded-md border border-gray-300 hover:bg-gray-50"
                        title="Edit"
                        onClick={() => openForm(item)}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="p-1.5 rounded-md border border-red-400 text-red-600 hover:bg-red-50"
                        title="Delete"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )
      )}


      {showForm && (
        <ProductDetailsForm
          product={editingItem}
          onSave={handleSave}
          onClose={closeForm}
        />
      )}
    </div>
  );
};

export default AdminMenu; 