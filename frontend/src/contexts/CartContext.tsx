import React, { createContext, useContext, useState, useEffect } from 'react';
import Swal from 'sweetalert2';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  customizations?: Record<string, any>;
  customPrice?: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: CartItem) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateNotes: (id: string, notes: string) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  total: number;
  getItemCount: () => number;
  isCartModalOpen: boolean;
  openCartModal: () => void;
  closeCartModal: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    // Load cart from localStorage on initialization
    const savedCart = localStorage.getItem('cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });

  const [isCartModalOpen, setIsCartModalOpen] = useState(false);

  // Save cart to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
    
    // Dispatch custom event to notify other components (like navbar) that cart has changed
    window.dispatchEvent(new CustomEvent('cartUpdated'));
  }, [items]);

  const addToCart = (item: CartItem) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => 
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });

    Swal.fire({
      toast: true,
      icon: 'success',
      text: 'Item added to cart',
      position: 'bottom-end',
      timer: 1500,
      showConfirmButton: false
    });
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) {
      removeItem(id);
      return;
    }
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, quantity } : item
    ));
  };

  const updateNotes = (id: string, notes: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, notes } : item
    ));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const clearCart = () => setItems([]);

  const total = items.reduce((sum, item) => {
    const price = item.customPrice ?? item.price;
    return sum + (price * item.quantity);
  }, 0);
  
  const getItemCount = () => {
    return items.reduce((count, item) => count + item.quantity, 0);
  };

  const openCartModal = () => setIsCartModalOpen(true);
  const closeCartModal = () => setIsCartModalOpen(false);

  const value = {
    items,
    addToCart,
    updateQuantity,
    updateNotes,
    removeItem,
    clearCart,
    total,
    getItemCount,
    isCartModalOpen,
    openCartModal,
    closeCartModal
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

// Custom hook to use cart context
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
