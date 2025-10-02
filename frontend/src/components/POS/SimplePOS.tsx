import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coffee, Plus, Minus, X, Settings, Trash2, ShoppingCart, MoreVertical } from "lucide-react";
import UnifiedCustomizeModal from "../customer/UnifiedCustomizeModal";
import { toast } from "sonner";

interface MenuItem {
	id: number;
	name: string;
	description: string;
	category: string;
	base_price: number;
	is_available: boolean;
	visible_in_pos: boolean;
	allow_customization?: boolean;
	image_url?: string;
}

interface CartItem extends MenuItem {
	cartItemId: string; // Unique identifier for each cart item
	quantity: number;
  notes?: string;
	customizations?: any;
	customPrice?: number;
}

interface CustomerInfo {
	name: string;
	tableNumber?: number;
	orderType: 'dine_in' | 'takeout';
	paymentMethod: 'cash' | 'gcash' | 'paymaya';
}

interface SimplePOSProps {
  hideSidebar?: boolean; // when true, render only menu grid (no customer/cart sidebar)
  sidebarOnly?: boolean; // when true, render only the sidebar (customer info + cart)
  children?: React.ReactNode; // PaymentProcessor component to render under cart
}

export default function SimplePOS({ hideSidebar = false, sidebarOnly = false, children }: SimplePOSProps) {
	const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
	const [cart, setCart] = useState<CartItem[]>([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedCategory, setSelectedCategory] = useState("All");
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
		name: '',
		tableNumber: undefined,
		orderType: 'dine_in',
		paymentMethod: 'cash'
	});
	const [customizeModalOpen, setCustomizeModalOpen] = useState(false);
	const [selectedItemForCustomization, setSelectedItemForCustomization] = useState<MenuItem | null>(null);
	const [showMoreMenu, setShowMoreMenu] = useState(false);
	const moreMenuRef = useRef<HTMLDivElement>(null);

	const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  useEffect(() => {
		// Only fetch menu when we need to render it
		if (!sidebarOnly) {
			fetchMenuItems();
		}
	}, [sidebarOnly]);

	// Handle click outside to close more menu
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
				setShowMoreMenu(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	// Helper functions
	const getTotalPrice = () => {
		return cart.reduce((total, item) => {
			// Ensure we have valid numbers for price calculation
			const customPrice = typeof item.customPrice === 'number' && !isNaN(item.customPrice) ? item.customPrice : null;
			const basePrice = typeof item.base_price === 'number' && !isNaN(item.base_price) ? item.base_price : 0;
			const itemPrice = customPrice || basePrice;
			const quantity = typeof item.quantity === 'number' && !isNaN(item.quantity) ? item.quantity : 0;
			
			// Debug logging for troubleshooting
			if (isNaN(itemPrice) || isNaN(quantity)) {
				console.warn('Invalid price or quantity for item:', {
					id: item.id,
					name: item.name,
					customPrice: item.customPrice,
					base_price: item.base_price,
					quantity: item.quantity,
					calculatedPrice: itemPrice,
					calculatedQuantity: quantity
				});
			}
			
			return total + (itemPrice * quantity);
		}, 0);
	};

	const clearCart = () => {
		setCart([]);
	};

	const processOrder = async () => {
		if (cart.length === 0 || !customerInfo.name.trim()) {
			alert('Please add items to cart and enter customer name');
			return;
		}

		// Validate table number for dine-in orders
		if (customerInfo.orderType === 'dine_in' && (!customerInfo.tableNumber || customerInfo.tableNumber < 1 || customerInfo.tableNumber > 6)) {
			alert('Please enter a valid table number (1-6) for dine-in orders');
			return;
		}

		// Calculate total and validate
		const totalAmount = getTotalPrice();
		console.log('Processing order...', { cart, customerInfo, total: totalAmount });

		// Validate total amount
		if (isNaN(totalAmount) || totalAmount <= 0) {
			alert('Invalid total amount. Please check your cart items.');
			console.error('Invalid total amount:', totalAmount, 'Cart items:', cart);
			return;
		}

		try {
			const orderData = {
				customer_info: customerInfo,
				items: cart.map(item => ({
					menu_item_id: item.id,
					quantity: item.quantity,
					notes: item.notes,
					customizations: item.customizations,
					custom_price: item.customPrice
				})),
				total_amount: totalAmount,
				order_type: customerInfo.orderType,
				payment_method: customerInfo.paymentMethod
			};

			console.log('Sending order data:', orderData);

			const response = await fetch(`${API_URL}/api/orders`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
				body: JSON.stringify(orderData),
			});

            const result = await response.json();

            if (result.success) {
                const newOrderId = result?.order?.orderId || result?.orderId || 'unknown';
                alert(`Order placed successfully! Order ID: ${newOrderId}`);
				clearCart();
				setCustomerInfo({
					name: '',
					tableNumber: undefined,
					orderType: 'dine_in',
					paymentMethod: 'cash'
				});
			} else {
				alert(`Failed to place order: ${result.message}`);
			}
		} catch (error) {
			console.error('Error placing order:', error);
			alert('Failed to place order. Please try again.');
		}
	};

  // When only the sidebar is requested, render it directly
  if (sidebarOnly) {
    return (
      <div className="w-full bg-gray-50 p-4 sm:p-6 flex flex-col self-start">
        {/* Customer Information */}
        <Card className="mb-4 bg-white border shadow-lg">
          <CardHeader>
            <CardTitle className="text-base text-[#3f3532]">Customer Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-[#6B5B5B] mb-1 block">Customer Name *</label>
                <Input
                  placeholder="Enter customer name"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                  className="h-9 bg-white border focus:border-[#a87437]"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Order Type *</label>
                <div className="flex space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="dine_in"
                      checked={customerInfo.orderType === 'dine_in'}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, orderType: e.target.value as 'dine_in' | 'takeout' }))}
                      className="w-4 h-4 text-amber-600"
                    />
                    <span className="text-sm text-gray-700">Dine In</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="takeout"
                      checked={customerInfo.orderType === 'takeout'}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, orderType: e.target.value as 'dine_in' | 'takeout' }))}
                      className="w-4 h-4 text-amber-600"
                    />
                    <span className="text-sm text-gray-700">Take Out</span>
                  </label>
                </div>
              </div>
              {customerInfo.orderType === 'dine_in' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Table Number *</label>
                  <Input
                    placeholder="Enter table number (1-6)"
                    type="number"
                    min="1"
                    max="6"
                    value={customerInfo.tableNumber || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      const num = parseInt(value);
                      if (value === '' || (num >= 1 && num <= 6)) {
                        setCustomerInfo(prev => ({ ...prev, tableNumber: value ? Number(value) : undefined }));
                      }
                    }}
                    className="h-9"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cart Panel */}
        <Card className="flex-1 flex flex-col bg-white border shadow-lg">
          <CardHeader className="flex-shrink-0">
            <CardTitle className="flex items-center gap-2 text-[#3f3532]">
              <ShoppingCart className="w-5 h-5 text-[#a87437]" />
              Cart ({cart.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0" style={{ minHeight: '500px' }}>
            <div className="flex-1 overflow-y-auto mb-4">
              {cart.length === 0 ? (
                <div className="text-center text-[#6B5B5B] py-12">
                  <Coffee className="w-12 h-12 mx-auto mb-3 text-[#a87437]/30" />
                  <p className="text-sm">Cart is empty</p>
                  <p className="text-xs text-[#6B5B5B]/60">Add items to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
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
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)} className="h-8 w-8 p-0">
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <Button size="sm" variant="outline" onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)} className="h-8 w-8 p-0">
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => removeFromCart(item.cartItemId)} className="h-8 w-8 p-0 text-red-600 hover:text-red-700">
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      {item.notes && (
                        <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          <strong>Notes:</strong> {item.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="flex-shrink-0 border-t pt-4 space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex justify-between text-lg font-semibold text-blue-900">
                  <span>Total Amount:</span>
                  <span>₱{getTotalPrice().toFixed(2)}</span>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  {cart.length} item{cart.length !== 1 ? 's' : ''} in cart
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={clearCart} variant="outline" className="flex-1 h-10 border-[#a87437] text-[#6B5B5B] hover:bg-[#a87437]/10" disabled={cart.length === 0}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Cart
                </Button>
                <Button onClick={processOrder} disabled={cart.length === 0 || !customerInfo.name.trim() || (customerInfo.orderType === 'dine_in' && (!customerInfo.tableNumber || customerInfo.tableNumber < 1 || customerInfo.tableNumber > 6))} className="flex-1 h-10 bg-[#a87437] hover:bg-[#a87437]/90 text-white">
                  Process Order
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Processor - rendered under cart */}
        {children && (
          <div className="mt-4">
            {children}
          </div>
        )}
      </div>
    );
  }

	const fetchMenuItems = async () => {
		try {
			setLoading(true);
			setError(null);
			
			// Fetch menu items that are visible in POS
			const response = await fetch(`${API_URL}/api/menu/pos`);
			const data = await response.json();
			
			if (data.success && data.menu_items) {
				// Ensure proper type conversion for numeric fields
				const processedItems = data.menu_items.map((item: any) => ({
					...item,
					base_price: Number(item.base_price),
					is_available: Boolean(item.is_available),
					visible_in_pos: Boolean(item.visible_in_pos)
				}));
				setMenuItems(processedItems);
			} else {
				setError('Failed to load menu items');
			}
		} catch (error) {
			console.error('Error fetching menu items:', error);
			setError('Failed to load menu items. Please try again later.');
		} finally {
			setLoading(false);
		}
	};

	// Get unique categories
	const categories = ["All", ...Array.from(new Set(menuItems.map(item => item.category)))];

	// Filter menu items based on search and category
	const filteredItems = menuItems.filter(item => {
		const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
							item.description.toLowerCase().includes(searchTerm.toLowerCase());
		const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
		return matchesSearch && matchesCategory;
	});

	const addToCart = (item: MenuItem | any, quantity: number = 1) => {
		// Check if this is a customized item (has customizations or customPrice)
		const isCustomized = item.customizations || (item.customPrice && item.customPrice !== item.base_price);
		
		// For customized items, we need to check if there's an exact match
		if (isCustomized) {
			const existingItem = cart.find(cartItem => 
				cartItem.id === item.id && 
				JSON.stringify(cartItem.customizations) === JSON.stringify(item.customizations) &&
				cartItem.customPrice === item.customPrice
			);

			if (existingItem) {
				setCart(prev => prev.map(cartItem =>
					cartItem.cartItemId === existingItem.cartItemId
						? { ...cartItem, quantity: cartItem.quantity + quantity }
						: cartItem
				));
			} else {
				// Ensure customPrice is a valid number
				const customPrice = typeof item.customPrice === 'number' && !isNaN(item.customPrice) 
					? item.customPrice 
					: (typeof item.base_price === 'number' && !isNaN(item.base_price) ? item.base_price : 0);
				
				const newCartItem: CartItem = {
					...item,
					cartItemId: `${item.id}-custom-${Date.now()}-${Math.random()}`,
					quantity,
					customizations: item.customizations || null,
					customPrice: customPrice
				};
				setCart(prev => [...prev, newCartItem]);
			}
			toast.success(`${item.name} added to cart`, { position: 'top-center' });
		} else {
			// For regular items, check if there's a non-customized version
			const existingItem = cart.find(cartItem => 
				cartItem.id === item.id && 
				!cartItem.customizations && 
				cartItem.customPrice === item.base_price
			);

			if (existingItem) {
				setCart(prev => prev.map(cartItem =>
					cartItem.cartItemId === existingItem.cartItemId
						? { ...cartItem, quantity: cartItem.quantity + quantity }
						: cartItem
				));
			} else {
				// Ensure base_price is a valid number
				const basePrice = typeof item.base_price === 'number' && !isNaN(item.base_price) ? item.base_price : 0;
				
				const newCartItem: CartItem = {
					...item,
					cartItemId: `${item.id}-${Date.now()}-${Math.random()}`,
					quantity,
					customizations: null,
					customPrice: basePrice
				};
				setCart(prev => [...prev, newCartItem]);
			}
			toast.success(`${item.name} added to cart`, { position: 'top-center' });
		}
	};

	const removeFromCart = (cartItemId: string) => {
		setCart(prev => prev.filter(item => item.cartItemId !== cartItemId));
	};

	const updateQuantity = (cartItemId: string, newQuantity: number) => {
		if (newQuantity <= 0) {
			removeFromCart(cartItemId);
		} else {
			setCart(prev => prev.map(item =>
				item.cartItemId === cartItemId ? { ...item, quantity: newQuantity } : item
			));
		}
	};


	const openCustomizeModal = (item: MenuItem) => {
		setSelectedItemForCustomization(item);
		setCustomizeModalOpen(true);
	};

	const handleCustomizationComplete = (customizedItem: any) => {
		if (customizedItem) {
			addToCart(customizedItem, 1);
		}
		setCustomizeModalOpen(false);
		setSelectedItemForCustomization(null);
	};


	if (loading) {
    return (
        <div className={`flex items-center justify-center ${hideSidebar ? 'h-64' : 'h-screen'}`}>
				<div className="text-center">
					<Coffee className="w-12 h-12 mx-auto mb-4 text-blue-600 animate-pulse" />
					<p className="text-lg font-medium text-gray-700">Loading menu...</p>
				</div>
			</div>
		);
	}

	if (error) {
    return (
        <div className={`flex items-center justify-center ${hideSidebar ? 'h-64' : 'h-screen'}`}>
				<div className="text-center">
					<Coffee className="w-12 h-12 mx-auto mb-4 text-red-600" />
					<p className="text-lg font-medium text-red-700 mb-2">Error loading menu</p>
					<p className="text-gray-600 mb-4">{error}</p>
					<Button onClick={fetchMenuItems} variant="outline">
						Try Again
					</Button>
				</div>
			</div>
		);
	}

    return (
        <div className={`flex ${hideSidebar ? '' : 'h-screen'}`}>
			{/* Left Side - Menu */}
				<div className={`${hideSidebar ? 'w-full' : 'flex-[1_1_auto]'} p-4 sm:p-6 overflow-auto`}>
				<div className="w-full">
					{/* Header */}
					<div className="mb-6">
					</div>

					{/* Search and Category Filter */}
					<div className="flex flex-col sm:flex-row gap-4 mb-6">
						<div className="flex-1">
							<Input
								placeholder="Search menu items..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="h-10 bg-white border focus:border-[#a87437]"
							/>
						</div>
						<div className="flex gap-2">
							{categories.map((category) => (
								<Button
									key={category}
									variant={selectedCategory === category ? "default" : "outline"}
									onClick={() => setSelectedCategory(category)}
									className={`h-10 ${
										selectedCategory === category 
											? "bg-[#a87437] hover:bg-[#a87437]/90 text-white" 
											: "border-[#a87437] text-[#6B5B5B] hover:bg-[#a87437]/10"
									}`}
								>
									{category}
								</Button>
							))}
							{/* 3-dot Menu Button */}
							<div className="relative" ref={moreMenuRef}>
								<Button
									variant="outline"
									onClick={() => setShowMoreMenu(!showMoreMenu)}
									className="h-10 border-[#a87437] text-[#6B5B5B] hover:bg-[#a87437]/10"
								>
									<MoreVertical className="w-4 h-4" />
								</Button>
								
								{/* Dropdown Menu */}
								{showMoreMenu && (
									<div className="absolute right-0 top-11 z-50 w-48 bg-white border border-gray-200 rounded-lg shadow-lg">
										<div className="py-1">
											<button
												onClick={() => {
													setViewMode("grid");
													setShowMoreMenu(false);
												}}
												className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center justify-between ${
													viewMode === "grid" ? "text-[#a87437] font-medium" : "text-gray-700"
												}`}
											>
												<span>Grid View</span>
												{viewMode === "grid" && <span className="text-[#a87437]">✓</span>}
											</button>
											<button
												onClick={() => {
													setViewMode("list");
													setShowMoreMenu(false);
												}}
												className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center justify-between ${
													viewMode === "list" ? "text-[#a87437] font-medium" : "text-gray-700"
												}`}
											>
												<span>List View</span>
												{viewMode === "list" && <span className="text-[#a87437]">✓</span>}
											</button>
										</div>
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Menu Items */}
					<div className="w-full">
						{viewMode === "grid" && (
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
								{filteredItems.map((item) => (
									<Card
										key={item.id}
										className="relative hover:shadow-xl transition-all duration-300 border shadow-lg bg-white hover:border-[#a87437] h-full"
									>
										{/* Badges top-right */}
										<div className="absolute right-3 top-3 flex flex-col items-end gap-2">
											<Badge variant="outline" className="text-xs">{item.category}</Badge>
										</div>
										<CardContent className="pt-4 pr-4 pb-3 pl-4 flex flex-col h-full min-h-[200px]">
											{/* Content: image and info on the left */}
											<div className="flex w-full">
												<div className="flex-1 min-w-0 flex gap-4">
													<div className="h-28 w-28 md:h-32 md:w-32 flex items-center justify-center overflow-hidden rounded-lg bg-gray-100 flex-shrink-0">
														{item.image_url ? (
															<img
																src={`${API_URL}${item.image_url}`}
																alt={item.name}
																className="w-full h-full object-contain p-1"
																onError={(e) => {
																	e.currentTarget.style.display = 'none';
																	e.currentTarget.nextElementSibling?.classList.remove('hidden');
																}}
															/>
														) : (
															<div className="w-full h-full flex items-center justify-center">
																<Coffee className="h-10 w-10 text-[#a87437]" />
															</div>
														)}
													</div>
													<div className="min-w-0 mt-4">
														<h3 className="text-left text-lg sm:text-xl font-semibold text-[#3f3532] mb-1 line-clamp-2">{item.name}</h3>
														<p className="text-left text-gray-600 text-sm mb-2 line-clamp-2">{item.description}</p>
														<span className="text-base sm:text-lg font-semibold text-amber-700">₱{Number(item.base_price).toFixed(2)}</span>
													</div>
												</div>
											</div>

											{/* Bottom-right actions */}
											<div className="mt-auto flex items-end justify-end gap-2 mb-0">
												<Button
													size="sm"
													variant="outline"
													onClick={() => openCustomizeModal(item)}
								disabled={false}
													className="text-xs border-[#a87437] text-[#6B5B5B] hover:bg-[#a87437]/10"
													title="Customize Item"
												>
													<Settings className="w-3 h-3 mr-1" />
													Customize
												</Button>
												<Button
													size="sm"
													variant="default"
													onClick={() => addToCart(item, 1)}
								disabled={false}
													className="text-xs bg-[#a87437] hover:bg-[#a87437]/90 text-white"
												>
													Add to Cart
												</Button>
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						)}

						{viewMode === "list" && (
							<div className="space-y-4">
								{filteredItems.map((item) => (
								<Card
									key={item.id}
									className="hover:shadow-xl transition-all duration-300 border shadow-lg bg-white hover:border-[#a87437]"
								>
									<CardContent className="p-4">
										<div className="flex gap-4">
											{/* Image */}
											<div className="h-20 w-20 flex-shrink-0 flex items-center justify-center overflow-hidden rounded-lg bg-gray-100">
												{item.image_url ? (
													<img
														src={`${API_URL}${item.image_url}`}
														alt={item.name}
														className="w-full h-full object-contain p-1"
														onError={(e) => {
															e.currentTarget.style.display = 'none';
															e.currentTarget.nextElementSibling?.classList.remove('hidden');
														}}
													/>
												) : null}
												<div className={`w-full h-full bg-gray-100 flex items-center justify-center ${item.image_url ? 'hidden' : ''}`}>
													<Coffee className="h-6 w-6 text-[#a87437]" />
												</div>
											</div>
											
											{/* Content */}
											<div className="flex-1 min-w-0 mt-2">
												<h3 className="text-lg sm:text-xl font-semibold text-[#3f3532] mb-1 line-clamp-2">{item.name}</h3>
												<p className="text-gray-600 text-sm mb-2 line-clamp-2">{item.description}</p>
												<div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3">
													<Badge variant="outline" className="text-sm">
														{item.category}
													</Badge>
													<span className="text-base sm:text-lg font-semibold text-amber-700">
														₱{Number(item.base_price).toFixed(2)}
													</span>
												</div>
											</div>
											
											{/* Actions */}
											<div className="ml-4 flex items-end justify-end gap-2">
												<Button size="sm" variant="outline" onClick={() => openCustomizeModal(item)} disabled={!item.is_available} className="text-xs border-[#a87437] text-[#6B5B5B] hover:bg-[#a87437]/10" title="Customize Item">
													<Settings className="w-3 h-3 mr-1" />
													Customize
												</Button>
												<Button size="sm" variant="default" onClick={() => addToCart(item, 1)} disabled={!item.is_available} className="text-xs bg-[#a87437] hover:bg-[#a87437]/90 text-white">
													Add to Cart
												</Button>
											</div>
										</div>
									</CardContent>
								</Card>
								))}
							</div>
						)}

					</div>
				</div>
			</div>

            {/* Right Side - Cart (hidden when hideSidebar) */}
            {!hideSidebar && (
                <div className="w-[24rem] xl:w-[26rem] 2xl:w-[28rem] min-w-[24rem] max-w-[28rem] p-4 sm:p-6 flex flex-col flex-shrink-0">
				{/* Customer Information */}
				<Card className="mb-4 bg-white border shadow-lg">
					<CardHeader>
						<CardTitle className="text-base text-[#3f3532]">Customer Information</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							<div>
								<label className="text-sm font-medium text-[#6B5B5B] mb-1 block">Customer Name *</label>
								<Input
									placeholder="Enter customer name"
									value={customerInfo.name}
									onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
									className="h-9 bg-white border focus:border-[#a87437]"
								/>
            </div>
							<div>
								<label className="text-sm font-medium text-gray-700 mb-2 block">Order Type *</label>
								<div className="flex space-x-4">
									<label className="flex items-center space-x-2">
										<input
											type="radio"
											value="dine_in"
											checked={customerInfo.orderType === 'dine_in'}
											onChange={(e) => setCustomerInfo(prev => ({ ...prev, orderType: e.target.value as 'dine_in' | 'takeout' }))}
											className="w-4 h-4 text-amber-600"
										/>
										<span className="text-sm text-gray-700">Dine In</span>
									</label>
									<label className="flex items-center space-x-2">
										<input
											type="radio"
											value="takeout"
											checked={customerInfo.orderType === 'takeout'}
											onChange={(e) => setCustomerInfo(prev => ({ ...prev, orderType: e.target.value as 'dine_in' | 'takeout' }))}
											className="w-4 h-4 text-amber-600"
										/>
										<span className="text-sm text-gray-700">Take Out</span>
									</label>
								</div>
							</div>
							{customerInfo.orderType === 'dine_in' && (
								<div>
									<label className="text-sm font-medium text-gray-700 mb-1 block">Table Number *</label>
									<Input
										placeholder="Enter table number (1-6)"
										type="number"
										min="1"
										max="6"
										value={customerInfo.tableNumber || ''}
										onChange={(e) => {
											const value = e.target.value;
											const num = parseInt(value);
											if (value === '' || (num >= 1 && num <= 6)) {
												setCustomerInfo(prev => ({ ...prev, tableNumber: value ? Number(value) : undefined }));
											}
										}}
										className="h-9"
									/>
									{customerInfo.tableNumber && (customerInfo.tableNumber < 1 || customerInfo.tableNumber > 6) && (
										<p className="text-sm text-red-500 mt-1">Table number must be between 1 and 6</p>
									)}
								</div>
							)}
						</div>
					</CardContent>
				</Card>

				<Card className="flex-1 flex flex-col bg-white border shadow-lg">
					<CardHeader className="flex-shrink-0">
						<CardTitle className="flex items-center gap-2 text-[#3f3532]">
							<ShoppingCart className="w-5 h-5 text-[#a87437]" />
							Cart ({cart.length})
						</CardTitle>
					</CardHeader>
					<CardContent className="flex-1 flex flex-col min-h-0" style={{ minHeight: '500px' }}>
						<div className="flex-1 overflow-y-auto mb-4">
							{cart.length === 0 ? (
								<div className="text-center text-[#6B5B5B] py-12">
									<Coffee className="w-12 h-12 mx-auto mb-3 text-[#a87437]/30" />
									<p className="text-sm">Cart is empty</p>
									<p className="text-xs text-[#6B5B5B]/60">Add items to get started</p>
								</div>
							) : (
								<div className="space-y-3">
									{cart.map((item) => (
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
											{/* Display customization details */}
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
													<Button
														size="sm"
														variant="outline"
														onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
														className="h-8 w-8 p-0"
													>
														<Minus className="w-3 h-3" />
													</Button>
													<span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
													<Button
														size="sm"
														variant="outline"
														onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
														className="h-8 w-8 p-0"
													>
														<Plus className="w-3 h-3" />
													</Button>
													<Button
														size="sm"
														variant="outline"
														onClick={() => removeFromCart(item.cartItemId)}
														className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
													>
														<X className="w-3 h-3" />
													</Button>
												</div>
											</div>
											{item.notes && (
												<div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
													<strong>Notes:</strong> {item.notes}
												</div>
											)}
										</div>
									))}
								</div>
							)}
						</div>

						{/* Cart Summary - Fixed at bottom */}
						<div className="flex-shrink-0 border-t pt-4 space-y-4">
							{/* Payment Method Selection */}
							<div>
								<label className="text-sm font-medium text-gray-700 mb-2 block">Payment Method</label>
								<div className="grid grid-cols-3 gap-2">
									<button
										type="button"
										onClick={() => setCustomerInfo(prev => ({ ...prev, paymentMethod: 'cash' }))}
										className={`p-2 rounded-lg border-2 transition-all ${
											customerInfo.paymentMethod === 'cash'
												? 'border-blue-500 bg-blue-50 text-blue-700'
												: 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
										}`}
									>
										<div className="text-center">
											<div className="text-base mb-1">💵</div>
											<div className="text-xs font-medium">Cash</div>
										</div>
									</button>
									<button
										type="button"
										onClick={() => setCustomerInfo(prev => ({ ...prev, paymentMethod: 'gcash' }))}
										className={`p-2 rounded-lg border-2 transition-all ${
											customerInfo.paymentMethod === 'gcash'
												? 'border-green-500 bg-green-50 text-green-700'
												: 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
										}`}
									>
										<div className="text-center">
											<div className="text-base mb-1">📱</div>
											<div className="text-xs font-medium">GCash</div>
										</div>
									</button>
									<button
										type="button"
										onClick={() => setCustomerInfo(prev => ({ ...prev, paymentMethod: 'paymaya' }))}
										className={`p-2 rounded-lg border-2 transition-all ${
											customerInfo.paymentMethod === 'paymaya'
												? 'border-purple-500 bg-purple-50 text-purple-700'
												: 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
										}`}
									>
										<div className="text-center">
											<div className="text-base mb-1">💳</div>
											<div className="text-xs font-medium">PayMaya</div>
										</div>
									</button>
								</div>
							</div>

							{/* Total Amount Display */}
							<div className="bg-blue-50 p-3 rounded-lg">
								<div className="flex justify-between text-lg font-semibold text-blue-900">
									<span>Total Amount:</span>
									<span>₱{getTotalPrice().toFixed(2)}</span>
								</div>
								<p className="text-xs text-blue-600 mt-1">
									{cart.length} item{cart.length !== 1 ? 's' : ''} in cart
								</p>
								<div className="mt-2 pt-2 border-t border-blue-200">
									<p className="text-xs text-blue-700">
										Payment: <span className="font-medium capitalize">{customerInfo.paymentMethod}</span>
									</p>
								</div>
							</div>

							{/* Action Buttons - Always Visible */}
							<div className="flex gap-2">
								<Button
									onClick={clearCart}
									variant="outline"
									className="flex-1 h-10 border-[#a87437] text-[#6B5B5B] hover:bg-[#a87437]/10"
									disabled={cart.length === 0}
								>
									<Trash2 className="w-4 h-4 mr-2" />
									Clear Cart
								</Button>
								<Button
									onClick={processOrder}
									disabled={cart.length === 0 || !customerInfo.name.trim() || (customerInfo.orderType === 'dine_in' && (!customerInfo.tableNumber || customerInfo.tableNumber < 1 || customerInfo.tableNumber > 6))}
									className="flex-1 h-10 bg-[#a87437] hover:bg-[#a87437]/90 text-white"
								>
									Process Order
								</Button>
							</div>
							
							{/* Debug Info */}
							<div className="text-xs text-gray-500 mt-2">
								Debug: Cart length: {cart.length}, Customer name: "{customerInfo.name}", Table: {customerInfo.tableNumber}
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Payment Processor - rendered under cart */}
				{children && (
					<div className="mt-4">
						{children}
					</div>
				)}
			</div>
			)}
            {/* Customization Modal */}
            {customizeModalOpen && selectedItemForCustomization && (
                <UnifiedCustomizeModal
                    item={{
                        ...selectedItemForCustomization,
                        price: selectedItemForCustomization.base_price
                    }}
                    onClose={() => {
                        setCustomizeModalOpen(false);
                        setSelectedItemForCustomization(null);
                    }}
                    onAdd={handleCustomizationComplete}
                />
            )}
		</div>
	);
} 