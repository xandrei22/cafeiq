import { Link } from "react-router-dom";
import { Home, Info, Star, MapPin, Heart } from "lucide-react";

import { useState, useEffect } from "react";

export function CustomerNavbar() {
  const [open, setOpen] = useState(false);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <nav className="fixed top-0 left-0 w-full bg-white/90 backdrop-blur border-b shadow-[0_8px_30px_rgba(0,0,0,0.15)] z-50">
      <div className="mx-auto max-w-[1600px] px-6 sm:px-10 lg:px-12">
        <div className="h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/images/logo.png" alt="CaféIQ Logo" className="h-10 w-10" />
            <span className="text-2xl sm:text-3xl tracking-tight text-[#a87437] font-bold">CaféIQ</span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-2 lg:gap-3 ml-32">
            <a href="/" className="flex items-center gap-2 py-2 text-[#7A6A6A] hover:text-[#3F3532] hover:underline transition-colors">
              <Home className="h-5 w-5" />
              <span className="text-base lg:text-lg">Home</span>
            </a>
            <a href="#about" className="flex items-center gap-2 py-2 text-[#7A6A6A] hover:text-[#3F3532] hover:underline transition-colors">
              <Info className="h-5 w-5" />
              <span className="text-base lg:text-lg">About</span>
            </a>
            <a href="#best-sellers" className="flex items-center gap-2 py-2 text-[#7A6A6A] hover:text-[#3F3532] hover:underline transition-colors">
              <Star className="h-5 w-5" />
              <span className="text-base lg:text-lg">Best Sellers</span>
            </a>
            <a href="#why-love-us" className="flex items-center gap-2 py-2 text-[#7A6A6A] hover:text-[#3F3532] hover:underline transition-colors">
              <Heart className="h-5 w-5" />
              <span className="text-base lg:text-lg">Why You'll Love Us</span>
            </a>
            <a href="#location" className="flex items-center gap-2 py-2 text-[#7A6A6A] hover:text-[#3F3532] hover:underline transition-colors">
              <MapPin className="h-5 w-5" />
              <span className="text-base lg:text-lg">Location</span>
            </a>
            <Link to="/login" className="ml-0 px-5 py-2 text-[#7A6A6A] text-base lg:text-lg font-semibold rounded-full hover:text-[#3F3532] hover:underline transition-colors">Login / Signup</Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-md text-[#3F3532] hover:bg-gray-100 shrink-0"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            <span className="sr-only">Open menu</span>
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={open ? "M6 18L18 6M6 6l12 12" : "M3.5 6.75h17M3.5 12h17M3.5 17.25h17"} />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden fixed top-16 left-0 right-0 bg-white border-b shadow-xl z-50">
          <div className="mx-auto max-w-[1600px] px-6 sm:px-10 lg:px-12 py-2 divide-y">
            <a href="/" className="block px-1 py-3 text-lg text-[#3F3532]">Home</a>
            <a href="#about" className="block px-1 py-3 text-lg text-[#3F3532]">About</a>
            <a href="#best-sellers" className="block px-1 py-3 text-lg text-[#3F3532]">Best Sellers</a>
            <a href="#why-love-us" className="block px-1 py-3 text-lg text-[#3F3532]">Why You'll Love Us</a>
            <a href="#location" className="block px-1 py-3 text-lg text-[#3F3532]">Location</a>
            <Link to="/login" className="block px-1 py-3 text-lg font-semibold text-[#a87437]">Login / Signup</Link>
          </div>
        </div>
      )}
    </nav>
  );
}