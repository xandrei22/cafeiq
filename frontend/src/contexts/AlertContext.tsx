import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LowStockItem {
  name: string;
  quantity: number;
  unit: string;
  reorderLevel: number;
  category: string;
  status: 'out_of_stock' | 'low_stock';
}

interface LowStockAlertData {
  items: LowStockItem[];
  criticalCount: number;
  lowStockCount: number;
  totalCount: number;
}

interface AlertContextType {
  showLowStockAlert: boolean;
  lowStockAlertData: {
    title: string;
    message: string;
    priority: 'urgent' | 'high' | 'medium';
    data: LowStockAlertData;
  } | null;
  setShowLowStockAlert: (show: boolean) => void;
  setLowStockAlertData: (data: any) => void;
  checkLowStockAlert: () => Promise<void>;
  isCheckingAlerts: boolean;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

interface AlertProviderProps {
  children: ReactNode;
}

export const AlertProvider: React.FC<AlertProviderProps> = ({ children }) => {
  const [showLowStockAlert, setShowLowStockAlert] = useState(false);
  const [lowStockAlertData, setLowStockAlertData] = useState<any>(null);
  const [isCheckingAlerts, setIsCheckingAlerts] = useState(false);

  const checkLowStockAlert = async () => {
    try {
      setIsCheckingAlerts(true);
      const response = await fetch('/api/low-stock/alert-status');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.hasAlert) {
          setLowStockAlertData(data.alert);
          setShowLowStockAlert(true);
        }
      }
    } catch (error) {
      console.error('Failed to check low stock alert:', error);
    } finally {
      setIsCheckingAlerts(false);
    }
  };

  const value = {
    showLowStockAlert,
    lowStockAlertData,
    setShowLowStockAlert,
    setLowStockAlertData,
    checkLowStockAlert,
    isCheckingAlerts,
  };

  return (
    <AlertContext.Provider value={value}>
      {children}
    </AlertContext.Provider>
  );
};
