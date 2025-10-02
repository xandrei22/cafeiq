import React from 'react';

interface LayeredCupVisualizationProps {
  customizations: {
    base: string;
    milk: string;
    syrup: string;
    toppings: string[];
    ice: boolean;
    size: 'medium' | 'large';
  };
  className?: string;
}

const LayeredCupVisualization: React.FC<LayeredCupVisualizationProps> = ({ customizations, className = '' }) => {
  // Determine cup size based on selected size
  const baseHeight = customizations.size === 'large' ? 500 : 300; // Much bigger height difference
  const baseWidth = baseHeight * 1.1; // Slightly reduced cup width

  const borderWidth = 8; // Thicker walls to match reference

  // Colors
  const milkColorMap: Record<string, string> = {
    'no milk': 'transparent',
    'whole milk': '#F5F5DC',
    'fresh milk': '#F5F5DC',
    'oat milk': '#F2E7C9',
    'almond milk': '#EFE6D6',
    'soy milk': '#F3EED9',
    'cream': '#FFF3D6'
  };
  const milkKey = (customizations.milk || 'no milk').toLowerCase();
  const milkColor = milkColorMap[milkKey] || (milkKey.includes('milk') ? '#F5F5DC' : 'transparent');
  const hasMilk = milkKey !== 'no milk' && milkColor !== 'transparent';
  const hasSyrup = customizations.syrup && customizations.syrup.toLowerCase() !== 'no sweetener';

  // Layout geometry
  const outerTopLeft = { x: baseWidth * 0.15, y: baseHeight * 0.15 };
  const outerTopRight = { x: baseWidth * 0.85, y: baseHeight * 0.15 };
  const outerBottomRight = { x: baseWidth * 0.75, y: baseHeight };
  const outerBottomLeft = { x: baseWidth * 0.25, y: baseHeight };

  const innerTopLeft = { x: outerTopLeft.x + borderWidth, y: outerTopLeft.y + borderWidth };
  const innerTopRight = { x: outerTopRight.x - borderWidth, y: outerTopRight.y + borderWidth };
  const innerBottomRight = { x: outerBottomRight.x - borderWidth, y: outerBottomRight.y - borderWidth };
  const innerBottomLeft = { x: outerBottomLeft.x + borderWidth, y: outerBottomLeft.y - borderWidth };

  // Helpers to get inner edge X at any Y (to keep liquid conforming to cup shape)
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const edgeXLeft = (y: number) => {
    const t = (y - innerTopLeft.y) / (innerBottomLeft.y - innerTopLeft.y);
    return lerp(innerTopLeft.x, innerBottomLeft.x, Math.min(Math.max(t, 0), 1));
  };
  const edgeXRight = (y: number) => {
    const t = (y - innerTopRight.y) / (innerBottomRight.y - innerTopRight.y);
    return lerp(innerTopRight.x, innerBottomRight.x, Math.min(Math.max(t, 0), 1));
  };

  // Ratios for layer split
  const coffeeRatio = hasMilk ? 0.62 : 0.95; // fill more when no milk
  const milkStartY = innerTopLeft.y + (baseHeight - innerTopLeft.y) * coffeeRatio;

  // Lid geometry based on cup top
  const cupTopY = outerTopLeft.y;
  const cupTopLeftX = outerTopLeft.x;
  const cupTopRightX = outerTopRight.x;
  const cupTopWidth = cupTopRightX - cupTopLeftX;
  const lidHeight = baseHeight * 0.12;
  const lidOverhang = cupTopWidth * 0.08; // Slightly increased overhang for wider lid
  const lidX = cupTopLeftX - lidOverhang;
  const lidY = cupTopY - lidHeight; // sit on top of the cup
  const lidWidth = cupTopWidth + lidOverhang * 2;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="text-sm font-medium text-gray-600 mb-2">
        {customizations.size.charAt(0).toUpperCase() + customizations.size.slice(1)} Size
      </div>
      <svg viewBox={`0 0 ${baseWidth} ${baseHeight + 20}`} className="w-full h-full drop-shadow-lg" preserveAspectRatio="xMidYMid meet">
        {/* Main cup outline with thick walls - transparent fill */}
        <path
          d={`M ${outerTopLeft.x} ${outerTopLeft.y} L ${outerTopRight.x} ${outerTopRight.y} L ${outerBottomRight.x} ${outerBottomRight.y} L ${outerBottomLeft.x} ${outerBottomLeft.y} Z`}
          fill="none"
          stroke="#000"
          strokeWidth={borderWidth}
        />


        {/* Coffee layer - fills entire cup including thick walls */}
        <path
          d={`M ${outerTopLeft.x} ${outerTopLeft.y}
              L ${outerTopRight.x} ${outerTopRight.y}
              L ${outerBottomRight.x} ${outerBottomRight.y}
              L ${outerBottomLeft.x} ${outerBottomLeft.y}
              Z`}
          fill="#4A2C2A"
        />

        {/* Milk layer if any - fills entire cup including walls */}
        {hasMilk && (
          <path
            d={`M ${outerTopLeft.x} ${outerTopLeft.y}
                L ${outerTopRight.x} ${outerTopRight.y}
                L ${outerBottomRight.x} ${outerBottomRight.y}
                L ${outerBottomLeft.x} ${outerBottomLeft.y}
                Z`}
            fill={milkColor}
          />
        )}

        {/* Syrup swirl near top when sweetener selected */}
        {hasSyrup && (
          <path
            d={`M ${outerTopLeft.x + 8} ${outerTopLeft.y + 12} C ${outerTopLeft.x + 40} ${outerTopLeft.y + 22}, ${outerTopRight.x - 40} ${outerTopLeft.y + 8}, ${outerTopRight.x - 8} ${outerTopLeft.y + 18}`}
            stroke="#C07A3A"
            strokeWidth={3}
            fill="none"
            opacity={0.7}
          />
        )}

        {/* Ice cubes for iced drinks */}
        {customizations.ice && (
          <g opacity={0.35}>
            {[0, 1, 2].map((i) => (
              <rect key={i}
                x={outerTopLeft.x + 15 + i * 25}
                y={outerTopLeft.y + 25 + (i % 2) * 18}
                width={16}
                height={16}
                rx={3}
                ry={3}
                fill="#FFFFFF"
                stroke="#BBD7FF"
              />
            ))}
          </g>
        )}

        {/* Simple toppings indicator as circles floating on coffee surface */}
        {customizations.toppings && customizations.toppings.length > 0 && (
          <g>
            {customizations.toppings.slice(0, 5).map((_, idx) => (
              <circle
                key={idx}
                cx={outerTopLeft.x + 25 + (idx % 5) * 22}
                cy={outerTopLeft.y + 25 - (idx % 2) * 6}
                r={4}
                fill="#F1C27D"
                stroke="#AA7A39"
                strokeWidth={1}
              />
            ))}
          </g>
        )}

        {/* Bottom line */}
        <line x1={outerBottomLeft.x} y1={outerBottomLeft.y} x2={outerBottomRight.x} y2={outerBottomRight.y} stroke="#000" strokeWidth={2} />

        {/* Lid shadow underhang to blend with cup */}
        <ellipse
          cx={(cupTopLeftX + cupTopRightX) / 2}
          cy={cupTopY + 2}
          rx={(cupTopWidth / 2) * 1.02}
          ry={4}
          fill="#000"
          opacity={0.15}
        />

        {/* Cup lid - capsule shape aligned to cup with overhang */}
        <rect
          x={lidX}
          y={lidY}
          width={lidWidth}
          height={lidHeight}
          rx={lidHeight / 2}
          ry={lidHeight / 2}
          fill="#2D1B1A"
        />

        {/* Lid glossy highlight */}
        <rect
          x={lidX + lidWidth * 0.06}
          y={lidY + lidHeight * 0.08}
          width={lidWidth * 0.88}
          height={lidHeight * 0.18}
          rx={lidHeight * 0.12}
          ry={lidHeight * 0.12}
          fill="#FFFFFF"
          opacity={0.08}
        />

        {/* Lid bottom rim to match reference */}
        <rect
          x={cupTopLeftX - lidOverhang * 0.1}
          y={cupTopY - 1}
          width={cupTopWidth + lidOverhang * 0.2}
          height={3}
          rx={1.5}
          ry={1.5}
          fill="#1f1211"
        />
      </svg>
    </div>
  );
};

export default LayeredCupVisualization; 