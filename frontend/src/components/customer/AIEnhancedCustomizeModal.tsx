import React, { useState, useEffect } from 'react';
import { X, Sparkles, Coffee, Milk, Star, Zap } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

interface CustomizationOption {
  id: string;
  label: string;
  unit: string;
  pricePerUnit: number;
  defaultQuantity: number;
  maxQuantity: number;
  category?: string;
}

interface AISuggestion {
  name: string;
  description: string;
  price: string;
  dietaryNotes: string;
  isPopular?: boolean;
}

interface AICombination {
  name: string;
  customizations: string[];
  description: string;
  totalPrice: string;
  rating?: number;
}

interface MenuItem {
  id: string;
  name: string;
  is_available: boolean;
  category: string;
  price: number;
}

interface AIEnhancedCustomizeModalProps {
  item: any;
  onClose: () => void;
  onAdd: (customizedItem: any) => void;
}

const AIEnhancedCustomizeModal: React.FC<AIEnhancedCustomizeModalProps> = ({ 
  item, 
  onClose, 
  onAdd 
}) => {
  const [size, setSize] = useState('Regular');
  const [temperature, setTemperature] = useState('Hot');
  const [milk, setMilk] = useState('');
  const [sweetener, setSweetener] = useState('');
  const [sugarLevel, setSugarLevel] = useState(100);
  const [instructions, setInstructions] = useState('');
  const [customizations, setCustomizations] = useState<{[key: string]: {selected: boolean, quantity: number}}>({});
  
  // AI Suggestions State
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [aiCombinations, setAiCombinations] = useState<AICombination[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  
  // Menu and Ingredients State
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [availableIngredients, setAvailableIngredients] = useState<any[]>([]);

  const sizePrices = { Regular: 0, Large: 30 };
  const basePrice = item.price;
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  // Dynamic options sourced from available ingredients only
  const [milkOptions, setMilkOptions] = useState<string[]>([]);
  const [sweetenerOptions, setSweetenerOptions] = useState<string[]>([]);
  const [customizationOptions, setCustomizationOptions] = useState<CustomizationOption[]>([]);

  const toId = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

  useEffect(() => {
    loadMenuItems();
    loadAvailableIngredients();
    loadAISuggestions();
  }, []);

  const loadMenuItems = async () => {
    try {
      const response = await fetch(`${API_URL}/api/menu`);
      const data = await response.json();
      
      if (data.success) {
        // Only get available menu items
        const availableItems = (data.menu || []).filter((item: MenuItem) => item.is_available);
        setMenuItems(availableItems);
      }
    } catch (error) {
      console.error('Error loading menu items:', error);
    }
  };

  const loadAvailableIngredients = async () => {
    try {
      const response = await fetch(`${API_URL}/api/inventory`);
      const data = await response.json();
      
      if (data.success) {
        const ingredients = data.ingredients || [];
        
        // Only show ingredients that are marked as available for customization (same as admin system)
        const customizationIngredients = ingredients.filter((i: any) => 
          i.is_available === true && i.visible_in_customization === true
        );
        
        setAvailableIngredients(customizationIngredients);
        
        // Use the centralized function to update customization options
        updateCustomizationOptions(customizationIngredients);
      }
    } catch (error) {
      console.error('Error loading available ingredients:', error);
    }
  };

  const loadAISuggestions = async () => {
    setIsLoadingAI(true);
    try {
      // Get AI ingredient recommendations for this specific drink
      const response = await fetch(`${API_URL}/api/ai-chat/customization/ingredient-recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          drinkName: item.name,
          drinkCategory: item.category,
          currentIngredients: Object.keys(customizations).filter(key => customizations[key].selected),
          preferences: {
            dietary: [],
            taste: 'balanced'
          }
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Convert AI recommendations to the expected format
        const suggestions = data.recommendations.map((rec: any) => ({
          name: rec.ingredientName,
          description: rec.reason,
          price: rec.priceImpact,
          dietaryNotes: rec.dietaryNotes,
          isPopular: rec.compatibility === 'high'
        }));
        setAiSuggestions(suggestions);
        
        // Update available ingredients from AI response if provided
        if (data.availableIngredients) {
          setAvailableIngredients(data.availableIngredients);
          updateCustomizationOptions(data.availableIngredients);
        }
      }
    } catch (error) {
      console.error('Error loading AI ingredient recommendations:', error);
      // Generate fallback suggestions based on available ingredients
      generateFallbackSuggestions();
    } finally {
      setIsLoadingAI(false);
    }
  };

  const updateCustomizationOptions = (ingredients: any[]) => {
    // Filter and categorize available ingredients
    const milkIngredients = ingredients.filter((i: any) => 
      i.name.toLowerCase().includes('milk') || 
      i.name.toLowerCase().includes('almond') || 
      i.name.toLowerCase().includes('oat') || 
      i.name.toLowerCase().includes('soy')
    );
    
    const sweetenerIngredients = ingredients.filter((i: any) => 
      i.name.toLowerCase().includes('sugar') || 
      i.name.toLowerCase().includes('syrup') || 
      i.name.toLowerCase().includes('honey')
    );
    
    const otherIngredients = ingredients.filter((i: any) => 
      !i.name.toLowerCase().includes('milk') && 
      !i.name.toLowerCase().includes('sugar') && 
      !i.name.toLowerCase().includes('syrup') && 
      !i.name.toLowerCase().includes('honey')
    );

    setMilkOptions(milkIngredients.map((i: any) => i.name));
    setSweetenerOptions(sweetenerIngredients.map((i: any) => i.name));
    
    // Create customization options from available ingredients only
    const allOptions = [...milkIngredients, ...sweetenerIngredients, ...otherIngredients].map((ingredient: any) => ({
      id: toId(ingredient.name),
      label: ingredient.name,
      unit: ingredient.actual_unit || 'piece',
      pricePerUnit: ingredient.cost_per_actual_unit || 15,
      defaultQuantity: 1,
      maxQuantity: 5,
      category: ingredient.category || 'other'
    }));
    
    setCustomizationOptions(allOptions);
    
    // Initialize customizations state
    const initialCustomizations: {[key: string]: {selected: boolean, quantity: number}} = {};
    allOptions.forEach(option => {
      initialCustomizations[option.id] = { selected: false, quantity: option.defaultQuantity };
    });
    setCustomizations(initialCustomizations);
  };

  const generateFallbackSuggestions = () => {
    // Only generate suggestions if we have actual ingredients available
    if (availableIngredients.length === 0) {
      setAiSuggestions([]);
      setAiCombinations([]);
      return;
    }

    // Generate suggestions based on available ingredients
    const availableMilk = availableIngredients.filter(i => 
      i.name.toLowerCase().includes('milk') || 
      i.name.toLowerCase().includes('almond') || 
      i.name.toLowerCase().includes('oat') || 
      i.name.toLowerCase().includes('soy')
    );
    
    const availableSweeteners = availableIngredients.filter(i => 
      i.name.toLowerCase().includes('sugar') || 
      i.name.toLowerCase().includes('syrup') || 
      i.name.toLowerCase().includes('honey')
    );

    const suggestions: AISuggestion[] = [];
    
    if (availableMilk.length > 0) {
      suggestions.push({
        name: availableMilk[0].name,
        description: `Creamy, ${availableMilk[0].name.toLowerCase().includes('almond') || availableMilk[0].name.toLowerCase().includes('oat') || availableMilk[0].name.toLowerCase().includes('soy') ? 'dairy-free alternative' : 'dairy option'}`,
        price: `+₱${availableMilk[0].price_per_unit || 15}`,
        dietaryNotes: availableMilk[0].name.toLowerCase().includes('almond') || availableMilk[0].name.toLowerCase().includes('oat') || availableMilk[0].name.toLowerCase().includes('soy') ? 'Vegan, lactose-free' : 'Contains dairy'
      });
    }
    
    if (availableSweeteners.length > 0) {
      suggestions.push({
        name: availableSweeteners[0].name,
        description: `Sweet, aromatic flavor enhancement`,
        price: `+₱${availableSweeteners[0].price_per_unit || 20}`,
        dietaryNotes: availableSweeteners[0].name.toLowerCase().includes('honey') ? 'Natural sweetener' : 'Contains sugar'
      });
    }

    // Add popular menu item suggestions
    const popularMenuItems = menuItems.filter(item => 
      item.category === 'Coffee' || item.category === 'Tea' || item.category === 'Specialty'
    ).slice(0, 3);

    const combinations: AICombination[] = [];
    if (suggestions.length >= 2) {
      combinations.push({
        name: "Classic Enhancement",
        customizations: [suggestions[0].name, suggestions[1].name],
        description: "Perfect balance of creaminess and sweetness",
        totalPrice: `+₱${Number((suggestions[0].price.match(/\d+/) || [0])[0]) + Number((suggestions[1].price.match(/\d+/) || [0])[0])}`,
        rating: 4.8
      });
    }

    setAiSuggestions(suggestions);
    setAiCombinations(combinations);
  };

  const calculateTotalPrice = () => {
    // Ensure basePrice is a valid number
    const validBasePrice = typeof basePrice === 'number' && !isNaN(basePrice) ? basePrice : 0;
    
    // Ensure size price is valid with fallback
    const sizePrice = sizePrices[size as keyof typeof sizePrices] || 0;
    
    let total = validBasePrice + sizePrice;
    
    Object.entries(customizations).forEach(([id, config]) => {
      if (config.selected && config.quantity > 0) {
        const option = customizationOptions.find(opt => opt.id === id);
        if (option) {
          const optionPrice = typeof option.pricePerUnit === 'number' && !isNaN(option.pricePerUnit) ? option.pricePerUnit : 0;
          const quantity = typeof config.quantity === 'number' && !isNaN(config.quantity) ? config.quantity : 0;
          total += optionPrice * quantity;
        }
      }
    });
    
    // Debug logging
    console.log('AIEnhancedCustomizeModal calculateTotalPrice:', {
      basePrice: validBasePrice,
      size: size,
      sizePrice: sizePrice,
      customizations: customizations,
      total: total
    });
    
    return total;
  };

  const handleCustomizationChange = (id: string, selected: boolean, quantity: number) => {
    setCustomizations(prev => ({
      ...prev,
      [id]: { selected, quantity }
    }));
  };

  const applyAICombination = (combination: AICombination) => {
    // Apply the AI-suggested combination
    const newCustomizations = { ...customizations };
    
    combination.customizations.forEach(customizationName => {
      const option = customizationOptions.find(opt => 
        opt.label.toLowerCase().includes(customizationName.toLowerCase())
      );
      
      if (option) {
        newCustomizations[option.id] = { selected: true, quantity: 1 };
      }
    });
    
    setCustomizations(newCustomizations);
    setShowAISuggestions(false);
  };

  const handleAdd = () => {
    const selectedCustomizations: {[key: string]: any} = {};
    
    Object.entries(customizations).forEach(([id, config]) => {
      if (config.selected && config.quantity > 0) {
        const option = customizationOptions.find(opt => opt.id === id);
        if (option) {
          selectedCustomizations[id] = {
            label: option.label,
            unit: option.unit,
            quantity: config.quantity,
            pricePerUnit: option.pricePerUnit,
            totalPrice: option.pricePerUnit * config.quantity
          };
        }
      }
    });

    const totalPrice = calculateTotalPrice();
    
    const customizedItem = {
      ...item,
      size,
      temperature,
      milk,
      sweetener,
      sugarLevel: sweetener === 'Sugar' ? sugarLevel : null,
      customizations: selectedCustomizations,
      instructions,
      custom: true,
      price: totalPrice,
      customPrice: totalPrice, // Also set customPrice for POS compatibility
      base_price: item.price || item.base_price || 0 // Ensure base_price is available
    };
    
    console.log('AIEnhancedCustomizeModal handleAdd:', {
      originalItem: item,
      customizedItem: customizedItem,
      totalPrice: totalPrice
    });

    onAdd(customizedItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Coffee className="w-6 h-6 text-orange-600" />
              <div>
                <h2 className="text-xl font-bold text-gray-800">Customize {item.name}</h2>
                <p className="text-sm text-gray-600">Make it your perfect drink</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* AI Suggestions Section */}
          <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-blue-800">
                <Sparkles className="w-5 h-5" />
                AI-Powered Suggestions
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAISuggestions(!showAISuggestions)}
                  className="ml-auto text-blue-600 border-blue-300 hover:bg-blue-100"
                >
                  {showAISuggestions ? 'Hide' : 'Show'} Suggestions
                </Button>
              </CardTitle>
            </CardHeader>
            
                         {showAISuggestions && (
               <CardContent className="space-y-4">
                 {aiSuggestions.length === 0 && aiCombinations.length === 0 ? (
                   <div className="text-center py-8 text-gray-500">
                     <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                     <p className="text-sm">No AI suggestions available right now.</p>
                     <p className="text-xs">Check back later or ask our staff for recommendations.</p>
                   </div>
                 ) : (
                   <>
                     {/* Popular Combinations */}
                     {aiCombinations.length > 0 && (
                       <div>
                         <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                           <Star className="w-4 h-4" />
                           Popular Combinations
                         </h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                           {aiCombinations.map((combination, index) => (
                             <Card key={index} className="border-blue-200 hover:border-blue-300 transition-colors">
                               <CardContent className="p-3">
                                 <div className="flex items-start justify-between mb-2">
                                   <h5 className="font-medium text-blue-800">{combination.name}</h5>
                                   <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                     {combination.rating ? `★ ${combination.rating}` : 'Popular'}
                                   </Badge>
                                 </div>
                                 <p className="text-sm text-gray-600 mb-2">{combination.description}</p>
                                 <div className="flex items-center justify-between">
                                   <div className="text-xs text-gray-500">
                                     {combination.customizations.join(' + ')}
                                   </div>
                                   <div className="text-sm font-medium text-blue-600">
                                     {combination.totalPrice}
                                   </div>
                                 </div>
                                 <Button
                                   size="sm"
                                   onClick={() => applyAICombination(combination)}
                                   className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white"
                                 >
                                   <Zap className="w-3 h-3 mr-1" />
                                   Apply This Combination
                                 </Button>
                               </CardContent>
                             </Card>
                           ))}
                         </div>
                       </div>
                     )}

                     {/* Individual Suggestions */}
                     {aiSuggestions.length > 0 && (
                       <div>
                         <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                           <Milk className="w-4 h-4" />
                           Recommended Add-ons
                         </h4>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                           {aiSuggestions.map((suggestion, index) => (
                             <Card key={index} className="border-blue-200 hover:border-blue-300 transition-colors">
                               <CardContent className="p-3">
                                 <div className="flex items-start justify-between mb-2">
                                   <h5 className="font-medium text-blue-800">{suggestion.name}</h5>
                                   <Badge variant="secondary" className="bg-green-100 text-green-700">
                                     {suggestion.isPopular ? 'Popular' : 'Recommended'}
                                   </Badge>
                                 </div>
                                 <p className="text-sm text-gray-600 mb-2">{suggestion.description}</p>
                                 <div className="flex items-center justify-between">
                                   <div className="text-xs text-gray-500">{suggestion.dietaryNotes}</div>
                                   <div className="text-sm font-medium text-blue-600">{suggestion.price}</div>
                                 </div>
                               </CardContent>
                             </Card>
                           ))}
                         </div>
                       </div>
                     )}
                   </>
                 )}
               </CardContent>
             )}
          </Card>

          {/* Basic Customizations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(sizePrices).map(([sizeName, price]) => (
                    <Button
                      key={sizeName}
                      variant={size === sizeName ? "default" : "outline"}
                      onClick={() => setSize(sizeName)}
                      className="justify-between"
                    >
                      {sizeName}
                      {price > 0 && <span className="text-xs">+₱{price}</span>}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Temperature</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Hot', 'Iced'].map((temp) => (
                    <Button
                      key={temp}
                      variant={temperature === temp ? "default" : "outline"}
                      onClick={() => setTemperature(temp)}
                    >
                      {temp}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Milk Type</label>
                <select
                  value={milk}
                  onChange={(e) => setMilk(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  title="Select milk type"
                  aria-label="Select milk type"
                >
                  <option value="">Regular Milk</option>
                  {milkOptions.map((option) => (
                    <option key={option} value={option}>
                      {option} (+₱15)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sweetener</label>
                <select
                  value={sweetener}
                  onChange={(e) => setSweetener(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  title="Select sweetener"
                  aria-label="Select sweetener"
                >
                  <option value="">No Sweetener</option>
                  {sweetenerOptions.map((option) => (
                    <option key={option} value={option}>
                      {option} (+₱20)
                    </option>
                  ))}
                </select>
              </div>

              {sweetener === 'Sugar' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sugar Level: {sugarLevel}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sugarLevel}
                    onChange={(e) => setSugarLevel(Number(e.target.value))}
                    className="w-full"
                    aria-label="Sugar level percentage"
                    title="Adjust sugar level"
                  />
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Additional Customizations</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {customizationOptions.map((option) => (
                    <div key={option.id} className="flex items-center justify-between p-2 border border-gray-200 rounded-md">
                      <div className="flex items-center gap-2">
                                                 <input
                           type="checkbox"
                           id={option.id}
                           checked={customizations[option.id]?.selected || false}
                           onChange={(e) => handleCustomizationChange(option.id, e.target.checked, customizations[option.id]?.quantity || 1)}
                           className="rounded"
                           title={`Select ${option.label}`}
                           aria-label={`Select ${option.label}`}
                         />
                        <label htmlFor={option.id} className="text-sm font-medium text-gray-700">
                          {option.label}
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                                                 <input
                           type="number"
                           min="1"
                           max={option.maxQuantity}
                           value={customizations[option.id]?.quantity || 1}
                           onChange={(e) => handleCustomizationChange(option.id, customizations[option.id]?.selected || false, Number(e.target.value))}
                           className="w-16 p-1 text-center border border-gray-300 rounded text-sm"
                           disabled={!customizations[option.id]?.selected}
                           title={`Quantity for ${option.label}`}
                           aria-label={`Quantity for ${option.label}`}
                         />
                        <span className="text-xs text-gray-500">{option.unit}</span>
                        <span className="text-sm font-medium text-blue-600">
                          ₱{option.pricePerUnit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Special Instructions</label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Any special requests or notes..."
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Price Summary */}
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Base Price: ₱{basePrice}</p>
                  {size !== 'Regular' && (
                    <p className="text-sm text-gray-600">Size Upgrade: +₱{sizePrices[size as keyof typeof sizePrices]}</p>
                  )}
                  {Object.entries(customizations).map(([id, config]) => {
                    if (config.selected && config.quantity > 0) {
                      const option = customizationOptions.find(opt => opt.id === id);
                      if (option) {
                        return (
                          <p key={id} className="text-sm text-gray-600">
                            {option.label} (x{config.quantity}): +₱{option.pricePerUnit * config.quantity}
                          </p>
                        );
                      }
                    }
                    return null;
                  })}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-800">₱{calculateTotalPrice()}</p>
                  <p className="text-sm text-gray-500">Total Price</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleAdd} className="bg-orange-600 hover:bg-orange-700">
              Add to Cart - ₱{calculateTotalPrice()}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIEnhancedCustomizeModal;
