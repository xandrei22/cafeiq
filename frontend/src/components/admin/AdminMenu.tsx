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

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

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
      const response = await fetch(`${API_URL}/api/menu`, { credentials: 'include' });
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

  const handleSave = async (productData: any) => {
    try {
      const url = editingItem 
        ? `${API_URL}/api/menu/${editingItem.id}`
        : `${API_URL}/api/menu`;
      
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
      const response = await fetch(`${API_URL}/api/menu/${id}`, {
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
      const response = await fetch(`${API_URL}/api/menu/${id}/visibility`, {
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {menuItems.map((item) => (
          <Card key={item.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-start justify-between gap-4 w-full">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 aspect-square">
                    {item.image_url ? (
                      <img
                        src={(() => {
                          const path = (item.image_url || '').trim();
                          if (!path) return '';
                          if (/^https?:\/\//i.test(path)) return path;
                          const withSlash = path.startsWith('/') ? path : `/${path}`;
                          return `${API_URL}${withSlash}`;
                        })()}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
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

      {menuItems.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-gray-500">
              <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No menu items yet</h3>
              <p className="text-sm">Create your first menu item to get started</p>
            </div>
          </CardContent>
        </Card>
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