import React, { useState, useEffect } from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { io, Socket } from 'socket.io-client';

interface CustomerEventFormProps {
  customer_id: number;
  customer_name: string;
}

// Predefined occasion options
const OCCASION_OPTIONS = [
  { value: 'birthday', label: 'Birthday Party' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'corporate', label: 'Corporate Event' },
  { value: 'graduation', label: 'Graduation' },
  { value: 'christening', label: 'Christening' },
  { value: 'anniversary', label: 'Anniversary' },
  { value: 'reunion', label: 'Family Reunion' },
  { value: 'seminar', label: 'Seminar/Conference' },
  { value: 'other', label: 'Other' },
];

const CustomerEventForm: React.FC<CustomerEventFormProps> = ({ customer_id, customer_name }) => {
  const [eventDate, setEventDate] = useState('');
  const [eventStartTime, setEventStartTime] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');
  const [cups, setCups] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [address, setAddress] = useState('');
  const [selectedOccasion, setSelectedOccasion] = useState('');
  const [customOccasion, setCustomOccasion] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [userEvents, setUserEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Get minimum date (tomorrow)
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  // Get the final event type value
  const getEventType = () => {
    if (selectedOccasion === 'other') {
      return customOccasion.trim();
    }
    return selectedOccasion;
  };

  // Fetch user's event requests
  const fetchUserEvents = async () => {
    try {
      const res = await fetch(`/api/events/customer/${customer_id}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setUserEvents(data.events);
      }
    } catch (err) {
      console.error('Failed to fetch user events:', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  // Load user events on component mount and setup WebSocket
  React.useEffect(() => {
    // Initialize Socket.IO connection
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
    const newSocket = io(API_URL);
    setSocket(newSocket);

    // Join customer room for real-time updates
    newSocket.emit('join-customer-room', { customerEmail: customer_name });

    // Listen for real-time updates
    newSocket.on('event-updated', (data) => {
      console.log('Event updated in CustomerEventForm:', data);
      fetchUserEvents();
    });

    fetchUserEvents();

    return () => {
      newSocket.close();
    };
  }, [customer_id, customer_name]);

  // Validate form
  const validateForm = () => {
    if (!eventDate) {
      toast('Event Date is required', { description: 'Please select an event date.' });
      return false;
    }
    if (!eventStartTime) {
      toast('Event Start Time is required', { description: 'Please select an event start time.' });
      return false;
    }
    if (!eventEndTime) {
      toast('Event End Time is required', { description: 'Please select an event end time.' });
      return false;
    }
    if (eventEndTime <= eventStartTime) {
      toast('Invalid Time Range', { description: 'End time must be after start time.' });
      return false;
    }
    if (!cups || Number(cups) < 25) {
      toast('Number of Cups is required', { description: 'Minimum order is 25 cups.' });
      return false;
    }
    if (!contactName.trim()) {
      toast('Contact Name is required', { description: 'Please enter your contact name.' });
      return false;
    }
    if (!contactNumber.trim()) {
      toast('Contact Number is required', { description: 'Please enter your contact number.' });
      return false;
    }
    if (!address.trim()) {
      toast('Address is required', { description: 'Please enter the event address.' });
      return false;
    }
    if (!selectedOccasion) {
      toast('Event Type is required', { description: 'Please select an event type.' });
      return false;
    }
    if (selectedOccasion === 'other' && !customOccasion.trim()) {
      toast('Custom Event Type is required', { description: 'Please specify the custom event type.' });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    const formData = {
      customer_id,
      customer_name,
      contact_name: contactName,
      contact_number: contactNumber,
      event_date: eventDate,
      event_start_time: eventStartTime,
      event_end_time: eventEndTime,
      address: address,
      event_type: getEventType(),
      notes: notes.trim(),
      cups: Number(cups),
    };
    
    console.log('Submitting event form with data:', formData);
    
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      console.log('Response status:', res.status);
      const data = await res.json();
      console.log('Response data:', data);
      
      if (res.ok && data.success) {
        toast('Event request submitted!', { description: 'Your event request has been sent to the admin.' });
        // Reset form
        setEventDate('');
        setEventStartTime('');
        setEventEndTime('');
        setCups('');
        setContactName('');
        setContactNumber('');
        setAddress('');
        setSelectedOccasion('');
        setCustomOccasion('');
        setNotes('');
        // Refresh user events
        fetchUserEvents();
      } else {
        toast('Submission failed', { description: data.message || 'Please try again.' });
      }
    } catch (err) {
      console.error('Network error:', err);
      toast('Network error', { description: 'Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600';
      case 'accepted': return 'text-green-600';
      case 'rejected': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'accepted': return 'Accepted';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="max-w-6xl mx-2 sm:mx-4 lg:mx-6 pt-4">
        {/* Header */}
        <div className="space-y-4 sm:space-y-6 px-2 sm:px-4 lg:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Event Reservations</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Reserve coffee for your special events and celebrations</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-8 max-w-5xl mx-auto justify-start items-start lg:ml-16">
          {/* Event Form - Left Side */}
          <Card className="w-full lg:w-1/2 border-2 border-[#a87437] shadow-xl hover:shadow-2xl transition-shadow duration-300">
            <CardContent className="p-6">
              <form className="space-y-6" onSubmit={handleSubmit}>
                <h2 className="text-2xl font-bold text-[#6B5B5B] mb-6">Reserve for a Special Event</h2>
          
          <div>
            <Label htmlFor="event-date" className="text-sm font-medium text-[#6B5B5B] mb-2 block">Event Date *</Label>
            <Input
              id="event-date"
              type="date"
              value={eventDate}
              min={getMinDate()}
              onChange={e => setEventDate(e.target.value)}
              required
              className="h-12 border-2 border-[#a87437] rounded-xl focus:border-[#a87437] focus:ring-2 focus:ring-[#a87437]/20"
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 1 day advance booking required</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="event-start-time" className="text-sm font-medium text-[#6B5B5B] mb-2 block">Event Start Time *</Label>
              <Input
                id="event-start-time"
                type="time"
                value={eventStartTime}
                onChange={e => setEventStartTime(e.target.value)}
                required
                className="h-12 border-2 border-[#a87437] rounded-xl focus:border-[#a87437] focus:ring-2 focus:ring-[#a87437]/20"
              />
              <p className="text-xs text-gray-500 mt-1">When your event begins</p>
            </div>
            <div>
              <Label htmlFor="event-end-time" className="text-sm font-medium text-[#6B5B5B] mb-2 block">Event End Time *</Label>
              <Input
                id="event-end-time"
                type="time"
                value={eventEndTime}
                onChange={e => setEventEndTime(e.target.value)}
                required
                className="h-12 border-2 border-[#a87437] rounded-xl focus:border-[#a87437] focus:ring-2 focus:ring-[#a87437]/20"
              />
              <p className="text-xs text-gray-500 mt-1">When your event ends</p>
            </div>
          </div>
          
          <div>
            <Label htmlFor="occasion" className="text-sm font-medium text-[#6B5B5B] mb-2 block">Event Type/Occasion *</Label>
            <Select value={selectedOccasion} onValueChange={setSelectedOccasion} required>
              <SelectTrigger className="w-full h-12 border-2 border-[#a87437] rounded-xl focus:border-[#a87437] focus:ring-2 focus:ring-[#a87437]/20">
                <SelectValue placeholder="Select an occasion" />
              </SelectTrigger>
              <SelectContent>
                {OCCASION_OPTIONS.map((occasion) => (
                  <SelectItem key={occasion.value} value={occasion.value}>
                    {occasion.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedOccasion === 'other' && (
            <div>
              <Label htmlFor="custom-occasion" className="text-sm font-medium text-[#6B5B5B] mb-2 block">Specify Event Type *</Label>
              <Input
                id="custom-occasion"
                type="text"
                placeholder="Enter your custom event type"
                value={customOccasion}
                onChange={e => setCustomOccasion(e.target.value)}
                required
                className="h-12 border-2 border-[#a87437] rounded-xl focus:border-[#a87437] focus:ring-2 focus:ring-[#a87437]/20"
              />
            </div>
          )}
          
          <div>
            <Label htmlFor="cups" className="text-sm font-medium text-[#6B5B5B] mb-2 block">Number of Cups *</Label>
            <Input
              id="cups"
              type="number"
              min={25}
              value={cups}
              onChange={e => setCups(e.target.value)}
              required
              className="h-12 border-2 border-[#a87437] rounded-xl focus:border-[#a87437] focus:ring-2 focus:ring-[#a87437]/20"
            />
            <p className="text-xs text-gray-500 mt-1">Minimum order is 25 cups</p>
          </div>
          
          <div>
            <Label htmlFor="contact-name" className="text-sm font-medium text-[#6B5B5B] mb-2 block">Contact Name *</Label>
            <Input
              id="contact-name"
              type="text"
              placeholder="Enter your full name"
              value={contactName}
              onChange={e => setContactName(e.target.value)}
              required
              className="h-12 border-2 border-[#a87437] rounded-xl focus:border-[#a87437] focus:ring-2 focus:ring-[#a87437]/20"
            />
          </div>
          
          <div>
            <Label htmlFor="contact-number" className="text-sm font-medium text-[#6B5B5B] mb-2 block">Contact Number *</Label>
            <Input
              id="contact-number"
              type="tel"
              placeholder="e.g., 0921473335"
              value={contactNumber}
              onChange={e => setContactNumber(e.target.value)}
              required
              className="h-12 border-2 border-[#a87437] rounded-xl focus:border-[#a87437] focus:ring-2 focus:ring-[#a87437]/20"
            />
          </div>
          
          <div>
            <Label htmlFor="address" className="text-sm font-medium text-[#6B5B5B] mb-2 block">Complete Address *</Label>
            <Textarea
              id="address"
              placeholder="Enter the complete event address (street, barangay, etc.)"
              value={address}
              onChange={e => setAddress(e.target.value)}
              required
              rows={3}
              className="border-2 border-[#a87437] rounded-xl focus:border-[#a87437] focus:ring-2 focus:ring-[#a87437]/20"
            />
          </div>
          
          <div>
            <Label htmlFor="notes" className="text-sm font-medium text-[#6B5B5B] mb-2 block">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any special requirements or additional information"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="border-2 border-[#a87437] rounded-xl focus:border-[#a87437] focus:ring-2 focus:ring-[#a87437]/20"
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full h-12 bg-[#a87437] hover:bg-[#8f652f] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300" 
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Submit Event Request'}
          </Button>
              </form>
            </CardContent>
          </Card>

          {/* Your Event Requests - Right Side */}
          <Card className="w-full lg:w-1/2 border-2 border-[#a87437] shadow-xl hover:shadow-2xl transition-shadow duration-300 lg:sticky lg:top-4">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-[#6B5B5B] mb-6">Your Event Requests</h3>
        
              {loadingEvents ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#a87437] mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">Loading...</p>
                </div>
              ) : userEvents.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No event requests yet</p>
                  <p className="text-sm text-gray-400 mt-1">Submit your first event request using the form</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  {userEvents.map((event) => (
                    <div key={event.id} className="border-2 border-[#a87437] rounded-xl p-4 bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-semibold text-[#6B5B5B]">{event.event_type}</h4>
                        <span className={`text-xs font-medium px-3 py-1 rounded-full ${getStatusColor(event.status)} bg-white border border-gray-200`}>
                          {getStatusText(event.status)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-2">
                        <p><span className="font-medium text-[#6B5B5B]">Date:</span> {new Date(event.event_date).toLocaleDateString()}</p>
                        <p><span className="font-medium text-[#6B5B5B]">Time:</span> {event.event_start_time || 'TBD'} - {event.event_end_time || 'TBD'}</p>
                        <p><span className="font-medium text-[#6B5B5B]">Cups:</span> {event.cups}</p>
                        {event.contact_name && (
                          <p><span className="font-medium text-[#6B5B5B]">Contact:</span> {event.contact_name}</p>
                        )}
                        <p><span className="font-medium text-[#6B5B5B]">Location:</span> {event.address.substring(0, 50)}{event.address.length > 50 ? '...' : ''}</p>
                        {event.notes && (
                          <p><span className="font-medium text-[#6B5B5B]">Notes:</span> {event.notes.substring(0, 50)}{event.notes.length > 50 ? '...' : ''}</p>
                        )}
                        {event.admin_response_date && (
                          <p><span className="font-medium text-[#6B5B5B]">Admin Response:</span> {new Date(event.admin_response_date).toLocaleDateString()}</p>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-3 pt-2 border-t border-gray-200">
                        Submitted: {new Date(event.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CustomerEventForm; 