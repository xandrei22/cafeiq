import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, AlertCircle, User } from 'lucide-react';

const AdminUsernameVerification: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [verifying, setVerifying] = useState(true);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

    useEffect(() => {
        const token = searchParams.get('token');
        if (!token) {
            setError('No verification token provided');
            setVerifying(false);
            return;
        }

        verifyUsername(token);
    }, [searchParams]);

    const verifyUsername = async (token: string) => {
        try {
            const response = await fetch(`${API_URL}/api/settings/admin/username/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setSuccess(true);
            } else {
                setError(data.error || 'Verification failed');
            }
        } catch (error) {
            console.error('Error verifying username:', error);
            setError('Network error occurred during verification');
        } finally {
            setVerifying(false);
        }
    };

    const handleRedirect = () => {
        navigate('/admin/dashboard');
    };

    if (verifying) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Verifying your username change...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="max-w-md w-full mx-4">
                <div className="bg-white rounded-lg shadow-sm border p-8">
                    {success ? (
                        <div className="text-center">
                            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                Username Updated Successfully!
                            </h1>
                            <p className="text-gray-600 mb-6">
                                Your username has been successfully updated. You can now log in with your new username.
                            </p>
                            <button
                                onClick={handleRedirect}
                                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Go to Dashboard
                            </button>
                        </div>
                    ) : (
                        <div className="text-center">
                            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                Verification Failed
                            </h1>
                            <p className="text-gray-600 mb-6">
                                {error || 'The verification link is invalid or has expired. Please try requesting a new verification email.'}
                            </p>
                            <div className="space-y-3">
                                <button
                                    onClick={() => navigate('/admin/settings')}
                                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Go to Settings
                                </button>
                                <button
                                    onClick={() => navigate('/admin/dashboard')}
                                    className="w-full bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                                >
                                    Go to Dashboard
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminUsernameVerification;

















