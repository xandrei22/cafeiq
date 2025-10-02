import React, { useState, useEffect } from 'react';
import { X, Sparkles, Coffee, Star, Zap } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import LayeredCupVisualization from './LayeredCupVisualization';
import CustomizationQuantitySelector from './CustomizationQuantitySelector';

interface CustomizationOption {
  id: string;
  label: string;
  unit: string;
  pricePerUnit: number;
  defaultQuantity: number;
  maxQuantity: number;
  category?: string;
  ingredientId?: number;
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

// MenuItem interface removed (unused)

interface UnifiedCustomizeModalProps {
  item: any;
  onClose: () => void;
  onAdd: (customizedItem: any) => void;
}

const UnifiedCustomizeModal: React.FC<UnifiedCustomizeModalProps> = ({ 
  item, 
  onClose, 
  onAdd 
}) => {
  // Basic customization states
  const [size, setSize] = useState('Regular');
  const [temperature, setTemperature] = useState('Hot');
  const [milk, setMilk] = useState('');
  const [sweetener, setSweetener] = useState('');
  const [sugarLevel, setSugarLevel] = useState(100);
  const [instructions, setInstructions] = useState('');
  
  // Customization quantities state
  const [customizations, setCustomizations] = useState<{[key: string]: {selected: boolean, quantity: number}}>({});
  
  // AI suggestions state
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [aiCombinations, setAiCombinations] = useState<AICombination[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);

  const sizePrices = { Regular: 0, Large: 30 };
  const basePrice = item.price;

  // API base (normalize: strip trailing /api if present to avoid /api/api/*)
  const RAW_API = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5001';
  const API_BASE = typeof RAW_API === 'string' ? RAW_API.replace(/\/?api\/?$/i, '') : 'http://localhost:5001';

  // Dynamic options sourced from inventory
  const [milkOptions, setMilkOptions] = useState<string[]>([]);
  const [sweetenerOptions, setSweetenerOptions] = useState<string[]>([]);
  const [customizationOptions, setCustomizationOptions] = useState<CustomizationOption[]>([]);

  // Helper to slugify ids from names
  const toId = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

  // Fetch available ingredients from inventory
  useEffect(() => {
    const fetchIngredients = async () => {
      try {
        // Use only the global ingredients endpoint
        const response = await fetch(`${API_BASE}/api/menu/ingredients`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Ingredients API response:', data);
          
          if (data.success && data.ingredients) {
            const ingredients = data.ingredients;
            console.log('Raw ingredients from API:', ingredients);
            
            // Categorize ingredients - be more flexible with filtering
            const milkTypes = ingredients
              .filter((ing: any) => 
                (ing.category && ing.category.toLowerCase().includes('milk')) || 
                ing.name.toLowerCase().includes('milk') ||
                ing.name.toLowerCase().includes('cream')
              )
              .map((ing: any) => ing.name || ing.ingredient_name || ing.display_name || 'Milk');
            
            const sweeteners = ingredients
              .filter((ing: any) => 
                (ing.category && ing.category.toLowerCase().includes('sweetener')) || 
                ing.name.toLowerCase().includes('sugar') || 
                ing.name.toLowerCase().includes('syrup') ||
                ing.name.toLowerCase().includes('honey')
              )
              .map((ing: any) => ing.name || ing.ingredient_name || ing.display_name || 'Sweetener');
            
            const customizations = ingredients
              .filter((ing: any) => 
                (ing.category && ['topping', 'add-on', 'extra', 'spice', 'flavor', 'milk', 'sweetener'].includes(ing.category.toLowerCase())) ||
                ing.name.toLowerCase().includes('shot') ||
                ing.name.toLowerCase().includes('whipped') ||
                ing.name.toLowerCase().includes('cinnamon') ||
                ing.name.toLowerCase().includes('syrup')
              )
              .map((ing: any, idx: number) => {
                const rawLabel = ing.name || '';
                const label = (typeof rawLabel === 'string' && rawLabel.trim().length > 0)
                  ? rawLabel.trim()
                  : `Add-on ${idx + 1}`;
                const unit = ing.actual_unit || 'serving';
                const price = (typeof ing.extra_price_per_unit === 'number' && !isNaN(ing.extra_price_per_unit))
                  ? Number(ing.extra_price_per_unit)
                  : (Number(ing.price_per_unit) || Number(ing.cost_per_actual_unit) || 0);
                
                console.log(`Processing ingredient: ${label}, price: ${price}, type: ${typeof price}`);
                
                return {
                  id: toId(label),
                  label: label,
                  unit: unit,
                  pricePerUnit: price,
                  defaultQuantity: 1,
                  maxQuantity: 5,
                  category: ing.category || 'Extra',
                  ingredientId: ing.id
                };
              });
            
            console.log('Processed milk types:', milkTypes);
            console.log('Processed sweeteners:', sweeteners);
            console.log('Processed customizations:', customizations);
            
            setMilkOptions(['No Milk', ...milkTypes]);
            setSweetenerOptions(['No Sweetener', ...sweeteners]);
            setCustomizationOptions(customizations);
          } else {
            setFallbackOptions();
          }
        } else {
          setFallbackOptions();
        }
      } catch (error) {
        console.error('Error fetching ingredients:', error);
        setFallbackOptions();
      }
    };

    const setFallbackOptions = () => {
      setMilkOptions(['No Milk']);
      setSweetenerOptions(['No Sweetener']);
      setCustomizationOptions([]);
    };

    fetchIngredients();
    // Pre-fetch AI suggestions when modal opens
    fetchAISuggestions();
  }, [API_BASE]);


  // Fetch AI suggestions
  const fetchAISuggestions = async () => {
    setLoadingAI(true);
    try {
      const requestBody = {
        drinkName: item.name,
        drinkCategory: item.category,
        currentIngredients: getCurrentIngredients(),
        preferences: {
          temperature: temperature,
          milkPreference: milk,
          sweetnessLevel: sugarLevel
        }
      };
      
      const response = await fetch(`${API_BASE}/api/ai-chat/ingredient-recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAiSuggestions(data.recommendations || []);
          setAiCombinations(data.combinations || []);
        }
      } else {
        console.error('AI API error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching AI suggestions:', error);
      // Generate fallback suggestions based on ACTUALLY available ingredients
      const availableIngredients = customizationOptions.map(opt => opt.label);
      
      // Only suggest ingredients that are actually available
      const fallbackSuggestions = [];
      const fallbackCombinations = [];
      
      if (availableIngredients.some(ing => ing.toLowerCase().includes('almond'))) {
        fallbackSuggestions.push({
          name: 'Almond Milk Boost',
          description: 'Creamy dairy-free alternative with subtle nutty flavor',
          price: '+₱15',
          dietaryNotes: 'Vegan, dairy-free, lower in calories',
          isPopular: true
        });
      }
      
      if (availableIngredients.some(ing => ing.toLowerCase().includes('honey'))) {
        fallbackSuggestions.push({
          name: 'Honey Sweetener',
          description: 'Natural sweetener with antibacterial properties',
          price: '+₱10',
          dietaryNotes: 'Contains antioxidants and trace minerals',
          isPopular: true
        });
      }
      
      if (availableIngredients.some(ing => ing.toLowerCase().includes('cinnamon'))) {
        fallbackSuggestions.push({
          name: 'Cinnamon Spice',
          description: 'Warm spice that enhances flavor and aroma',
          price: '+₱8',
          dietaryNotes: 'Antioxidant-rich, helps regulate blood sugar',
          isPopular: false
        });
      }
      
      if (availableIngredients.some(ing => ing.toLowerCase().includes('vanilla'))) {
        fallbackSuggestions.push({
          name: 'Vanilla Delight',
          description: 'Classic flavoring that enhances coffee naturally',
          price: '+₱12',
          dietaryNotes: 'Natural vanilla extract with antioxidant properties',
          isPopular: true
        });
      }
      
      // Create combinations only from available ingredients
      const availableForCombos = availableIngredients.filter(ing => 
        ing.toLowerCase().includes('almond') || 
        ing.toLowerCase().includes('honey') || 
        ing.toLowerCase().includes('cinnamon') || 
        ing.toLowerCase().includes('vanilla')
      );
      
      if (availableForCombos.length >= 2) {
        fallbackCombinations.push({
          name: 'Healthy Combo',
          customizations: availableForCombos.slice(0, 2),
          description: 'A nutritious combination of available ingredients',
          totalPrice: '+₱20',
          rating: 4.7
        });
      }
      
      setAiSuggestions(fallbackSuggestions);
      setAiCombinations(fallbackCombinations);
    } finally {
      setLoadingAI(false);
    }
  };

  const getCurrentIngredients = () => {
    const ingredients = [];
    if (milk && milk !== 'No Milk') ingredients.push(milk);
    if (sweetener && sweetener !== 'No Sweetener') ingredients.push(sweetener);
    return ingredients;
  };

  const calculateTotalPrice = () => {
    let total = basePrice + (sizePrices[size as keyof typeof sizePrices] || 0);
    
    // Add customization costs
    Object.entries(customizations).forEach(([id, config]) => {
      if (config.selected && config.quantity > 0) {
        const option = customizationOptions.find(opt => opt.id === id);
        if (option) {
          total += option.pricePerUnit * config.quantity;
        }
      }
    });
    
    return total;
  };

  const handleAdd = () => {
    const extras = Object.entries(customizations)
      .filter(([_, config]) => config.selected && config.quantity > 0)
      .map(([id, config]) => {
        const option = customizationOptions.find(opt => opt.id === id);
        return {
          ingredientId: option?.ingredientId,
          amount: config.quantity,
          unit: option?.unit,
          name: option?.label || id
        };
      });

    const customizedItem = {
      id: item.id,
      name: item.name,
      price: calculateTotalPrice(),
      customizations: {
        size,
        temperature,
        milk,
        sweetener,
        sugarLevel,
        instructions,
        addOns: extras.map(e => ({ id: toId(e.name || ''), quantity: e.amount, name: e.name })),
        // Extras array used by backend deduction (base + extra)
        extras
      },
      instructions: instructions || 'Customized drink'
    };

    onAdd(customizedItem);
    onClose();
  };

  const applyAISuggestion = (_suggestion: AISuggestion) => {
    // Apply AI suggestion logic here
    // This would parse the suggestion and apply relevant customizations
    setShowAISuggestions(false);
  };

  const applyAICombination = (combination: AICombination) => {
    // Apply AI combination logic here
    const newCustomizations = { ...customizations };
    combination.customizations.forEach(customization => {
      const option = customizationOptions.find(opt => opt.label === customization);
      if (option) {
        newCustomizations[option.id] = { selected: true, quantity: 1 };
      }
    });
    setCustomizations(newCustomizations);
    setShowAISuggestions(false);
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
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
          {/* AI-Powered Suggestions */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-blue-800">AI-Powered Suggestions</h3>
                    <p className="text-sm text-blue-600">Get personalized ingredient recommendations</p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    if (!showAISuggestions) {
                      // Show suggestions and fetch if not already loaded
                      setShowAISuggestions(true);
                      if (aiSuggestions.length === 0) {
                        fetchAISuggestions();
                      }
                    } else {
                      // Hide suggestions
                      setShowAISuggestions(false);
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  {showAISuggestions ? 'Hide Suggestions' : 'Show Suggestions'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Customization Options */}
            <div className="space-y-6">
              {/* Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Size</label>
                <div className="flex gap-2">
                  {Object.entries(sizePrices).map(([sizeOption, price]) => (
                    <button
                      key={sizeOption}
                      onClick={() => setSize(sizeOption)}
                      className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                        size === sizeOption
                          ? 'bg-[#a87437] text-white border-[#a87437]'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-[#a87437]/50'
                      }`}
                    >
                      {sizeOption}
                      {price > 0 && <span className="text-xs ml-1">+₱{price}</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Temperature */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Temperature</label>
                <div className="flex gap-2">
                  {['Hot', 'Iced'].map((temp) => (
                    <button
                      key={temp}
                      onClick={() => setTemperature(temp)}
                      className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                        temperature === temp
                          ? 'bg-[#a87437] text-white border-[#a87437]'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-[#a87437]/50'
                      }`}
                    >
                      {temp}
                    </button>
                  ))}
                </div>
              </div>

              {/* Milk Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Milk Type</label>
                <select
                  value={milk}
                  onChange={(e) => setMilk(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a87437] focus:border-[#a87437]"
                  title="Select milk type"
                  aria-label="Milk type selection"
                >
                  {milkOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sweetener */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Sweetener</label>
                <select
                  value={sweetener}
                  onChange={(e) => setSweetener(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a87437] focus:border-[#a87437]"
                  title="Select sweetener"
                  aria-label="Sweetener selection"
                >
                  {sweetenerOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sugar Level */}
              {sweetener && sweetener !== 'No Sweetener' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Sugar Level: {sugarLevel}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="25"
                    value={sugarLevel}
                    onChange={(e) => setSugarLevel(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    title="Adjust sugar level"
                    aria-label="Sugar level slider"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </div>
              )}

              {/* Add-ons & Extras */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Add-ons & Extras</h3>
                <p className="text-sm text-gray-600 mb-4">Choose your quantities</p>
                <div className="space-y-3">
                  {customizationOptions.map((option) => (
                    <div key={option.id} className="w-full">
                      {/* Ensure a visible text label even if selector fails to render it */}
                      <div className="text-xs text-gray-600 mb-1">{option.label || option.id || 'Add-on'}</div>
                      <CustomizationQuantitySelector
                        label={option.label || option.id}
                        unit={option.unit}
                        defaultQuantity={option.defaultQuantity}
                        maxQuantity={option.maxQuantity}
                        pricePerUnit={option.pricePerUnit}
                        selected={customizations[option.id]?.selected || false}
                        onToggle={(selected) =>
                          setCustomizations((prev) => ({
                            ...prev,
                            [option.id]: {
                              selected,
                              quantity: selected
                                ? (prev[option.id]?.quantity || option.defaultQuantity)
                                : 0,
                            },
                          }))
                        }
                        onChange={(quantity) =>
                          setCustomizations((prev) => ({
                            ...prev,
                            [option.id]: {
                              selected: quantity > 0,
                              quantity,
                            },
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Special Instructions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Special Instructions</label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Any special requests or modifications..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a87437] focus:border-[#a87437] h-20 resize-none"
                />
              </div>
            </div>

            {/* Right Column - Drink Preview and Order Summary */}
            <div className="space-y-6">
              {/* Your Drink */}
              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="p-6">
                  <h3 className="font-bold mb-4 text-center">Your Drink</h3>
                  <LayeredCupVisualization
                    customizations={{
                      base: item.name,
                      milk: milk,
                      syrup: sweetener,
                      toppings: Object.entries(customizations)
                        .filter(([_, config]) => config.selected && config.quantity > 0)
                        .map(([id, _]) => customizationOptions.find(opt => opt.id === id)?.label || id),
                      ice: temperature === 'Iced',
                      size: size === 'Large' ? 'large' : 'medium'
                    }}
                    className="w-full h-64"
                  />
                </CardContent>
              </Card>

              {/* Order Summary */}
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="p-6">
                  <h3 className="font-bold mb-4">Order Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>{item.name} ({size})</span>
                      <span>₱{(basePrice + (sizePrices[size as keyof typeof sizePrices] || 0)).toFixed(2)}</span>
                    </div>
                    
                    {Object.entries(customizations).map(([id, config]) => {
                      if (config.selected && config.quantity > 0) {
                        const option = customizationOptions.find(opt => opt.id === id);
                        if (option) {
                          return (
                            <div key={id} className="flex justify-between text-sm">
                              <span>{option.label} (x{config.quantity})</span>
                              <span>₱{(option.pricePerUnit * config.quantity).toFixed(2)}</span>
                            </div>
                          );
                        }
                      }
                      return null;
                    })}
                    
                    <div className="border-t pt-2 flex justify-between font-bold">
                      <span>Total</span>
                      <span>₱{calculateTotalPrice().toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI Suggestions Panel */}
              {showAISuggestions && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-blue-800 mb-4 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      AI Recommendations
                    </h3>
                    
                    {loadingAI ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-sm text-blue-600 mt-2">Getting suggestions...</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* AI Suggestions */}
                        {aiSuggestions.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                              <Star className="w-4 h-4" />
                              Recommended Combinations
                            </h4>
                            <div className="space-y-2">
                              {aiSuggestions.map((suggestion, index) => (
                                <div key={index} className="bg-white p-3 rounded-lg border border-blue-200">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h5 className="font-medium text-gray-900">{suggestion.name}</h5>
                                      <p className="text-sm text-gray-600">{suggestion.description}</p>
                                      <p className="text-xs text-blue-600">{suggestion.dietaryNotes}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-green-600">{suggestion.price}</span>
                                      <Button
                                        onClick={() => applyAISuggestion(suggestion)}
                                        size="sm"
                                        className="bg-blue-600 hover:bg-blue-700"
                                      >
                                        Apply
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* AI Combinations */}
                        {aiCombinations.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                              <Zap className="w-4 h-4" />
                              Popular Combinations
                            </h4>
                            <div className="space-y-2">
                              {aiCombinations.map((combination, index) => (
                                <div key={index} className="bg-white p-3 rounded-lg border border-blue-200">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h5 className="font-medium text-gray-900">{combination.name}</h5>
                                      <p className="text-sm text-gray-600">{combination.description}</p>
                                      <div className="flex items-center gap-2 mt-1">
                                        {combination.customizations.map((customization, idx) => (
                                          <Badge key={idx} variant="secondary" className="text-xs">
                                            {customization}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-green-600">{combination.totalPrice}</span>
                                      <Button
                                        onClick={() => applyAICombination(combination)}
                                        size="sm"
                                        className="bg-blue-600 hover:bg-blue-700"
                                      >
                                        Apply
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {aiSuggestions.length === 0 && aiCombinations.length === 0 && !loadingAI && (
                          <div className="text-center py-4 text-gray-500">
                            <Sparkles className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                            <p className="text-sm">No AI suggestions available right now.</p>
                            <p className="text-xs">Check back later or ask our staff for recommendations.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-6 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleAdd} className="bg-[#a87437] hover:bg-[#8f652f]">
              Add to Cart - ₱{calculateTotalPrice().toFixed(2)}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedCustomizeModal;
