import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Lock, Mail, AlertCircle, CheckCircle, Shield } from 'lucide-react';
import { useAuth } from '../customer/AuthContext';

interface StaffSettings {
    email: string;
    username: string;
    role: string;
    status: string;
    canChangeEmail: boolean;
    canChangeUsername: boolean;
}

const StaffSettings: React.FC = () => {
    const { user } = useAuth();
    const [settings, setSettings] = useState<StaffSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/settings/staff/settings`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setSettings(data.settings);
                } else {
                    setError(data.error || 'Failed to fetch settings');
                }
            } else {
                setError('Failed to fetch settings');
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
            setError('Failed to fetch settings');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading settings...</p>
                </div>
            </div>
        );
    }

    if (!settings) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <p className="text-gray-600">Failed to load settings</p>
                    <button 
                        onClick={fetchSettings}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => window.history.back()}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Go Back"
                        >
                            <ArrowLeft className="h-5 w-5 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Account</h1>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Success/Error Messages */}
                {success && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <p className="text-green-800">{success}</p>
                        <button
                            onClick={() => setSuccess(null)}
                            className="ml-auto text-green-600 hover:text-green-800"
                        >
                            ×
                        </button>
                    </div>
                )}

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        <p className="text-red-800">{error}</p>
                        <button
                            onClick={() => setError(null)}
                            className="ml-auto text-red-600 hover:text-red-800"
                        >
                            ×
                        </button>
                    </div>
                )}

                {/* Menu Items */}
                <div className="space-y-2 mb-8">
                    {/* Settings */}
                    <div className="flex items-center p-4 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                        <div className="w-6 h-6 mr-4">
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <span className="text-gray-900 font-medium">Settings</span>
                    </div>

                    {/* Logout */}
                    <div className="flex items-center p-4 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                        <div className="w-6 h-6 mr-4">
                            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </div>
                        <span className="text-gray-900 font-medium">Logout</span>
                    </div>
                </div>

                {/* User Profile Section */}
                <div className="bg-[#a87437] rounded-lg p-6 text-white">
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                            <Shield className="w-8 h-8 text-[#a87437]" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">
                                {settings?.username || user?.username || 'Staff'}
                            </h3>
                            <p className="text-white/80 text-sm">
                                {settings?.email || user?.email || 'No email'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StaffSettings;