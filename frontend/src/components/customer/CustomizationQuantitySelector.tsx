import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';

interface CustomizationQuantitySelectorProps {
  label: string;
  unit: string; // e.g., "shot", "pump", "tsp"
  defaultQuantity?: number;
  minQuantity?: number;
  maxQuantity?: number;
  pricePerUnit?: number;
  onChange: (quantity: number) => void;
  selected: boolean;
  onToggle: (selected: boolean) => void;
}

export const CustomizationQuantitySelector: React.FC<CustomizationQuantitySelectorProps> = ({
  label,
  unit,
  defaultQuantity = 1,
  minQuantity = 0,
  maxQuantity = 10, // Reasonable upper limit for UX, not inventory-based
  pricePerUnit = 0,
  onChange,
  selected,
  onToggle = () => {},
}) => {
  const [quantity, setQuantity] = useState(defaultQuantity);

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= minQuantity && newQuantity <= maxQuantity) {
      setQuantity(newQuantity);
      onChange(newQuantity);
    }
  };

  const handleToggle = () => {
    const newSelected = !selected;
    try {
      if (typeof onToggle === 'function') {
        onToggle(newSelected);
      }
    } catch (_) {
      // ignore
    }
    if (newSelected) {
      onChange(quantity);
    } else {
      onChange(0);
    }
  };

  const increment = () => {
    handleQuantityChange(quantity + 1);
  };

  const decrement = () => {
    handleQuantityChange(quantity - 1);
  };

  const totalPrice = selected ? quantity * pricePerUnit : 0;

  return (
    <div className={`border rounded-xl p-3 transition-all duration-150 ${
      selected 
        ? 'bg-amber-50 border-amber-700 shadow' 
        : 'bg-white border-gray-300 hover:border-gray-400'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={handleToggle}
            className="w-4 h-4 text-amber-600 bg-gray-100 border-gray-300 rounded focus:ring-amber-500"
            aria-label={`Select ${label}`}
          />
          <label className="font-medium text-black" title={label || '(Unnamed)'}>
            {label && label.trim().length > 0 ? label : '(Unnamed ingredient)'}
          </label>
        </div>
        {totalPrice > 0 && (
          <span className="text-sm font-medium text-amber-700">
            +₱{totalPrice.toFixed(2)}
          </span>
        )}
      </div>
      
      {selected && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={decrement}
              disabled={quantity <= minQuantity}
              className="h-8 w-8 p-0 rounded-full"
            >
              <Minus className="w-3 h-3" />
            </Button>
            
            <span className="min-w-[60px] text-center text-sm font-medium">
              {quantity} {unit}{quantity !== 1 ? 's' : ''}
            </span>
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={increment}
              disabled={quantity >= maxQuantity}
              className="h-8 w-8 p-0 rounded-full"
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
          
          {pricePerUnit > 0 && !isNaN(Number(pricePerUnit)) && (
            <div className="text-xs text-gray-500">
              ₱{Number(pricePerUnit).toFixed(2)} per {unit}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomizationQuantitySelector;
