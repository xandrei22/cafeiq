import React from 'react';
import Swal from 'sweetalert2';
import OptimizedImage from './ui/OptimizedImage';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Coffee } from 'lucide-react';

interface MenuItemProps {
  item: {
    id: number;
    name: string;
    description: string;
    price: number;
    image_url?: string;
    category?: string;
    is_available?: boolean;
  };
  onAddToCart: (item: any) => void;
  hasTableAccess?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ item, onAddToCart, hasTableAccess = true }) => {
  const handleAddToCart = () => {
    onAddToCart(item);
    
    // Show sweet alert
    Swal.fire({
      position: 'top-end',
      icon: 'success',
      title: 'Added to Cart!',
      text: `${item.name} has been added to your cart`,
      showConfirmButton: false,
      timer: 1500,
      toast: true
    });
  };

  const isAvailable = item.is_available !== false; // Default to true if not specified

  return (
    <Card className="bg-white border shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Image */}
          <div className="h-20 w-20 flex-shrink-0 flex items-center justify-center overflow-hidden rounded-lg bg-gray-100">
            {item.image_url ? (
              <OptimizedImage
                src={item.image_url.startsWith('http') ? item.image_url : `${window.location.origin.replace(':5173', ':5001')}${item.image_url}`}
                alt={item.name}
                className="w-full h-full object-contain p-1"
                lazy={true}
                sizes="80px"
              />
            ) : (
              <Coffee className="h-6 w-6 text-[#a87437]" />
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg sm:text-xl font-semibold text-[#3f3532] mb-1 line-clamp-2">
              {item.name}
            </h3>
            <p className="text-gray-600 text-sm mb-2 line-clamp-2">
              {item.description}
            </p>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3">
              {item.category && (
                <Badge variant="outline" className="text-sm">
                  {item.category}
                </Badge>
              )}
              <span className="text-base sm:text-lg font-semibold text-amber-700">
                ₱{Number(item.price).toFixed(2)}
              </span>
              <Badge 
                variant={isAvailable ? "default" : "secondary"}
                className="text-sm"
              >
                {isAvailable ? 'Available' : 'Unavailable'}
              </Badge>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => onAddToCart({ ...item, customization: true })}
              disabled={!hasTableAccess || !isAvailable}
              size="sm"
              variant="outline"
              className="text-xs whitespace-nowrap"
              title={!hasTableAccess ? 'Table access required to customize items' : !isAvailable ? 'Item unavailable' : 'Customize this item'}
            >
              Customize
            </Button>
            <Button
              onClick={handleAddToCart}
              disabled={!hasTableAccess || !isAvailable}
              size="sm"
              className="bg-[#a87437] hover:bg-[#8f652f] text-white text-xs whitespace-nowrap"
              title={!hasTableAccess ? 'Table access required to add items to cart' : !isAvailable ? 'Item unavailable' : 'Add to cart'}
            >
              Add to Cart
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MenuItem;