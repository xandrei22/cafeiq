import AdminSales from '../admin/AdminSales';

// Staff can use the same sales management as admin
const StaffSales = () => {
  return <AdminSales />;
};

export default StaffSales;
