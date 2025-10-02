import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { io, Socket } from 'socket.io-client';
import { Star, MessageCircle, ThumbsUp } from 'lucide-react';
import './progress-bar.css';
import RatingBar from '../ui/RatingBar';

interface Feedback {
  id: number;
  customer_name: string;
  rating: number;
  comment: string;
  category: string;
  feedback_time: string;
}

interface FeedbackMetrics {
  totalReviews: number;
  averageRating: string;
  satisfiedCustomers: string;
}

export default function CustomerFeedback() {
  const { user, loading, authenticated } = useAuth();
  const navigate = useNavigate();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [metrics, setMetrics] = useState<(FeedbackMetrics & { ratingDistribution?: { [key: number]: number } }) | null>(null);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [, setSocket] = useState<Socket | null>(null);
  const [showAll, setShowAll] = useState(false);
  
  // Form state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [category, setCategory] = useState('General');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    console.log('Auth state:', { loading, authenticated, user }); // Debug log
    if (!loading && !authenticated) {
      navigate("/customer-login");
      return;
    }
    
    if (authenticated) {
      // Initialize Socket.IO connection
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const newSocket = io(API_URL);
      setSocket(newSocket);

      // Join customer room for real-time updates
      newSocket.emit('join-customer-room', { customerEmail: user?.email });

      // Listen for real-time updates
      newSocket.on('feedback-updated', (data) => {
        console.log('Feedback updated:', data);
        fetchFeedbacks();
        fetchMetrics();
      });

      fetchFeedbacks();
      fetchMetrics();

      return () => {
        newSocket.close();
      };
    }
  }, [loading, authenticated, navigate, user]);

  const fetchFeedbacks = async () => {
    try {
      const response = await fetch('/api/feedback', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setFeedbacks(data);
      }
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
    } finally {
      setLoadingFeedbacks(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/feedback/metrics', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('User object:', user); // Debug log
    const customerName = user?.name || user?.username || user?.email || 'Anonymous';
    console.log('Customer name:', customerName); // Debug log
    if (!user) {
      alert('Please log in to submit feedback');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          customer_name: customerName,
          rating,
          comment,
          category
        }),
      });

      if (response.ok) {
        // Reset form
        setRating(5);
        setComment('');
        setCategory('General');
        setShowForm(false);
        
        // Refresh feedbacks and metrics
        await fetchFeedbacks();
        await fetchMetrics();
        
        alert('Thank you for your feedback!');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating: number, interactive = false, onStarClick?: (star: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type={interactive ? 'button' : undefined}
            onClick={interactive ? () => onStarClick?.(star) : undefined}
            className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
            disabled={!interactive}
            aria-label={`${star} star${star === 1 ? '' : 's'}`}
            title={`${star} star${star === 1 ? '' : 's'}`}
          >
            <Star
              className={`w-4 h-4 ${
                star <= rating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'Food': 'bg-green-100 text-green-800',
      'Service': 'bg-blue-100 text-blue-800',
      'Ambience': 'bg-purple-100 text-purple-800',
      'General': 'bg-gray-100 text-gray-800',
    };
    return colors[category] || colors['General'];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        <main className="flex-1 bg-white p-0 m-0 w-full min-h-screen overflow-y-auto pt-20">
          <div className="flex items-center justify-center h-64">
            <span className="text-lg">Loading...</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="space-y-4 sm:space-y-6 mx-2 sm:mx-4 lg:mx-6 pt-4">
        {/* Header Section */}
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Customer Feedback</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Share your experience and read what others have to say about us</p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
            {/* Overall Rating and Satisfaction Metrics */}
            {metrics && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Average Rating and Distribution Section */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 lg:col-span-8">
                  <div className="flex items-start gap-8">
                    {/* Average Rating */}
                    <div className="text-center">
                      <div className="text-5xl font-bold text-[#3f3532] mb-3">{metrics.averageRating}</div>
                      <div className="flex items-center justify-center gap-1 mb-4">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-6 h-6 ${
                              star <= Math.floor(parseFloat(metrics.averageRating))
                                ? 'fill-yellow-400 text-yellow-400'
                                : star === Math.ceil(parseFloat(metrics.averageRating)) && parseFloat(metrics.averageRating) % 1 !== 0
                                ? 'fill-yellow-400/50 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="bg-[#8B4513] text-white px-4 py-2 rounded-full text-sm font-medium inline-block">
                        Total Reviews {metrics.totalReviews}
                      </div>
                    </div>
                    
                    {/* Rating Distribution */}
                    <div className="flex-1">
                      <div className="space-y-3">
                        {[5, 4, 3, 2, 1].map((rating) => {
                          const count = metrics?.ratingDistribution?.[rating] || 0;
                          const total = Number(metrics?.totalReviews || 0) || 1;
                          const pct = Math.max(0, Math.min(100, (count / total) * 100));
                          return (
                            <div key={rating} className="flex items-center gap-3">
                              <span className="text-sm font-medium text-gray-600 w-4">{rating}</span>
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <RatingBar value={pct} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Customer Satisfaction */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 lg:col-span-4">
                  <div className="w-full max-w-md mx-auto flex items-center justify-center gap-6 mt-6">
                    <ThumbsUp className="w-28 h-28 text-[#8B4513]" />
                    <div className="text-left">
                      <div className="text-3xl sm:text-4xl font-bold text-[#3f3532] leading-tight">{metrics.satisfiedCustomers}</div>
                      <div className="text-sm text-gray-600">Customer Satisfaction</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Filter Bar and Share Button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              {/* Filter Bar */}
              <div className="flex flex-wrap gap-3 bg-gray-50 rounded-xl p-4">
                <Button
                  variant="outline"
                  className="bg-white hover:bg-gray-100 text-gray-700 border-gray-300 rounded-full px-4 py-2"
                >
                  All categories
                </Button>
                <Button
                  variant="outline"
                  className="bg-white hover:bg-gray-100 text-gray-700 border-gray-300 rounded-full px-4 py-2"
                >
                  All Ratings
                </Button>
              </div>
              
              {/* Share Experience Button */}
              <Button
                onClick={() => setShowForm(!showForm)}
                className="bg-[#8B4513] hover:bg-[#7A3A0A] text-white px-6 py-3 text-lg font-semibold rounded-full shadow-lg"
              >
                {showForm ? 'Cancel' : 'Share your experience'}
              </Button>
            </div>

            {/* Feedback Form */}
            {showForm && (
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="text-[#6B5B5B]">Share Your Feedback</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitFeedback} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rating
                      </label>
                      {renderStars(rating, true, setRating)}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category
                      </label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Food">Food & Drinks</SelectItem>
                          <SelectItem value="Service">Service</SelectItem>
                          <SelectItem value="Ambience">Ambience</SelectItem>
                          <SelectItem value="General">General</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Experience
                      </label>
                      <textarea
                        value={comment}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setComment(e.target.value)}
                        placeholder="Tell us about your experience at Mauricio's Cafe and Bakery..."
                        className="min-h-[120px] w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6B5B5B] focus:border-transparent"
                        required
                      />
                    </div>

                    <div className="flex justify-end gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowForm(false)}
                        disabled={submitting}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="bg-[#6B5B5B] hover:bg-[#5A4A4A]"
                        disabled={submitting}
                      >
                        {submitting ? 'Submitting...' : 'Submit Feedback'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Recent Reviews Section */}
            <div>
              <h2 className="text-2xl font-bold text-[#3f3532] mb-6">Recent Reviews</h2>
              
              {loadingFeedbacks ? (
                <div className="flex items-center justify-center h-32">
                  <span className="text-lg">Loading reviews...</span>
                </div>
              ) : feedbacks.length === 0 ? (
                <Card className="bg-white border border-gray-200 rounded-xl">
                  <CardContent className="p-8 text-center">
                    <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">No reviews yet</h3>
                    <p className="text-gray-500">Be the first to share your experience!</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {(showAll ? feedbacks : feedbacks.slice(0, 5)).map((feedback) => (
                    <Card key={feedback.id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#8B4513] rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-sm">
                                {feedback.customer_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <h4 className="font-semibold text-[#3f3532] text-base">{feedback.customer_name}</h4>
                              <div className="flex items-center gap-1 text-sm text-gray-500">
                                <span>{formatDate(feedback.feedback_time)}</span>
                              </div>
                            </div>
                          </div>
                          <Badge className={`${getCategoryColor(feedback.category)} text-xs px-3 py-1 rounded-full`}>
                            {feedback.category}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= feedback.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-medium text-gray-600">{feedback.rating}/5</span>
                        </div>
                        
                        {feedback.comment && (
                          <div>
                            <h5 className="font-medium text-[#3f3532] text-base mb-2">
                              {feedback.comment.length > 50 
                                ? feedback.comment.substring(0, 50) + '...' 
                                : feedback.comment
                              }
                            </h5>
                            {feedback.comment.length > 50 && (
                              <p className="text-gray-700 text-sm leading-relaxed">{feedback.comment}</p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {feedbacks.length > 5 && (
                    <div className="flex justify-center pt-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowAll(prev => !prev)}
                        className="px-6"
                      >
                        {showAll ? 'Show less' : `Show all (${feedbacks.length - 5} more)`}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
        </div>
      </div>
    </div>
  );
} 