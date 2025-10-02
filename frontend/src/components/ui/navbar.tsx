import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from "./navigation-menu";

export function Navbar() {
  return (
    <nav className="w-full bg-white border-b shadow-sm px-6 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {/* Logo placeholder */}
        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill="#a3e635" />
            <text x="12" y="16" textAnchor="middle" fontSize="12" fill="#222" fontFamily="Poppins, sans-serif">☕</text>
          </svg>
        </div>
        <span className="text-xl font-bold tracking-tight">CaféIQ</span>
      </div>
      <NavigationMenu className="flex-1 justify-end">
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuLink href="/" className="px-4 py-2">Home</NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink href="/about" className="px-4 py-2">About</NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink href="/contact" className="px-4 py-2">Contact</NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </nav>
  );
} 