import React from 'react';
import AdminRewardProcessing from '../admin/AdminRewardProcessing';

const StaffRewardProcessing: React.FC = () => {
  return (
    <AdminRewardProcessing 
      mode="staff" 
      titleClassName="text-2xl sm:text-3xl" 
      containerClassName="space-y-4 sm:space-y-6 mx-2 sm:mx-4 lg:mx-6 p-4"
    />
  );
};

export default StaffRewardProcessing;
