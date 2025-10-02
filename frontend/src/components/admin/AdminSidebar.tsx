import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarFooter,
} from "../ui/sidebar";
import { Link, useLocation, useNavigate } from "react-router-dom";
import React from "react";
import { mobileFriendlySwal } from '@/utils/sweetAlertConfig';

const menuItems = [
  { label: "Dashboard", path: "/admin/dashboard", icon: "/images/dashboard.png" },
  { label: "Manage Inventory", path: "/admin/inventory", icon: "/images/inventory.png" },
  { label: "Manage Menu", path: "/admin/menu", icon: "/images/menu.png" },
  { label: "Orders", path: "/admin/orders", icon: "/images/Orders.png" },
  { label: "POS System", path: "/admin/pos", icon: "/images/payment.png" },
  { label: "Manage Events", path: "/admin/events", icon: "/images/events.png" },
  { label: "Loyalty Points", path: "/admin/loyalty", icon: "/images/loyalty points.png" },
  { label: "Sales", path: "/admin/sales", icon: "/images/payment.png" },
  { label: "Feedback", path: "/admin/feedback", icon: "/images/feedback.png" },
  { label: "Activity Logs", path: "/admin/activity-logs", icon: "/images/activity logs.png" },
  { label: "Manage Staff Account", path: "/admin/staff", icon: "/images/staff management.png" },
];
const settingsItems = [
  { label: "Settings", path: "/admin/settings", icon: "/images/settings.png" },
  { label: "Logout", path: "/admin/logout", icon: "/images/logout.png", isLogout: true },
];

const AdminSidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    const result = await mobileFriendlySwal.confirm(
      'Are you sure?',
      'You will be logged out of the admin portal.',
      'Yes, logout!',
      'Cancel'
    );
    if (result.isConfirmed) {
      await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
      navigate('/admin');
    }
  };
  return (
    <Sidebar collapsible="icon" className="w-64 bg-white border-r hidden sm:flex">
      <SidebarHeader className="bg-[#a87437] text-white h-14">
        <div className="flex flex-row items-center gap-1 h-full pl-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:pl-0">
          <div className="bg-white rounded-full p-0.5 group-data-[collapsible=icon]:p-0.5">
            <img
              src="/images/logo.png"
              alt="CaféIQ Admin Logo"
              className="h-3 w-3 object-cover group-data-[collapsible=icon]:h-3 group-data-[collapsible=icon]:w-3"
            />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <div className="font-bold text-xs text-white">CaféIQ</div>
            <div className="text-xs text-white/90 leading-none">Mauricio's Cafe and Bakery</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu className="pl-3 group-data-[collapsible=icon]:pl-3 flex flex-col">
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton 
                  asChild 
                  isActive={location.pathname === item.path}
                >
                  <Link to={item.path} className="flex items-center gap-2">
                    <img src={item.icon} alt={item.label + ' icon'} className="w-5 h-5" />
                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarGroup className="group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center">
        <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Settings</SidebarGroupLabel>
        <SidebarMenu className="pl-3 group-data-[collapsible=icon]:pl-3 flex flex-col">
          {settingsItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton 
                asChild 
                isActive={location.pathname === item.path}
              >
                {item.isLogout ? (
                  <a href="#" onClick={handleLogout} className="flex items-center gap-2 text-red-600">
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </a>
                ) : (
                  <Link to={item.path} className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </Link>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>
      <SidebarFooter className="group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center">
        <div className="bg-white rounded-lg p-4 text-[#6B5B5B] border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#a87437] rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="font-semibold text-[#6B5B5B]">Admin</span>
              <span className="text-xs text-[#6B5B5B]/70">admin@cafeiq.com</span>
            </div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AdminSidebar; 