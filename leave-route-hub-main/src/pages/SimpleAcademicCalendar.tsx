import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Calendar, Plus, LogOut, AlertTriangle } from 'lucide-react';

interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  department?: string;
}

interface AcademicEvent {
  _id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  event_type: string;
  created_by?: {
    full_name: string;
  };
  created_at: string;
}

const SimpleAcademicCalendar = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [eventType, setEventType] = useState('');

  useEffect(() => {
    // Get user from localStorage
    const userData = localStorage.getItem('auth_user');
    if (userData) {
      setUser(JSON.parse(userData));
      fetchEvents();
    } else {
      window.location.href = '/';
    }
  }, []);

  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      
      const response = await fetch(`${API_BASE_URL}/academic-calendar`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      } else {
        toast.error('Failed to load calendar events');
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load calendar events');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('auth_token');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      
      const response = await fetch(`${API_BASE_URL}/academic-calendar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description,
          start_date: startDate,
          end_date: endDate,
          event_type: eventType,
        }),
      });

      if (response.ok) {
        toast.success('Event added successfully!');
        setShowForm(false);
        setTitle('');
        setDescription('');
        setStartDate('');
        setEndDate('');
        setEventType('');
        fetchEvents();
      } else {
        const data = await response.json();
        toast.error(data.message || 'Failed to add event');
      }
    } catch (error) {
      console.error('Error adding event:', error);
      toast.error('Failed to add event');
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    window.location.href = '/';
  };

  const getEventTypeBadge = (eventType: string) => {
    const typeConfig = {
      exam: { label: 'Exam', className: 'bg-red-100 text-red-800' },
      'expert-session': { label: 'Expert Session', className: 'bg-purple-100 text-purple-800' },
      'important-event': { label: 'Important Event', className: 'bg-orange-100 text-orange-800' },
      holiday: { label: 'Holiday', className: 'bg-green-100 text-green-800' },
      deadline: { label: 'Deadline', className: 'bg-yellow-100 text-yellow-800' },
      other: { label: 'Other', className: 'bg-gray-100 text-gray-800' },
    };

    const config = typeConfig[eventType] || typeConfig.other;
    
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const isRestrictedEventType = (eventType: string) => {
    return ['exam', 'expert-session', 'important-event'].includes(eventType);
  };

  const getUpcomingRestrictedDates = () => {
    const today = new Date();
    const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    return events
      .filter(event => {
        const eventStart = new Date(event.start_date);
        const eventEnd = new Date(event.end_date);
        return (eventStart <= nextMonth && eventEnd >= today) && 
               isRestrictedEventType(event.event_type);
      })
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  const canAddEvents = user.role === 'advisor' || user.role === 'hod';
  const upcomingRestricted = getUpcomingRestrictedDates();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Academic Calendar</h1>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => window.history.back()}>
              Back to Dashboard
            </Button>
            <div className="text-sm">
              <p className="font-medium">{user.full_name}</p>
              <p className="text-muted-foreground">{user.role}</p>
            </div>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-3xl font-bold">Academic Events</h2>
          {canAddEvents && (
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Event
            </Button>
          )}
        </div>

        {/* Leave Restriction Notice for Students */}
        {user.role === 'student' && upcomingRestricted.length > 0 && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center text-orange-800">
                <AlertTriangle className="mr-2 h-5 w-5" />
                Leave Restrictions Notice
              </CardTitle>
              <CardDescription className="text-orange-700">
                The following dates have restricted leave policies. Only medical leaves will be considered for review.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {upcomingRestricted.map((event) => (
                  <div key={event._id} className="flex justify-between items-center">
                    <span className="font-medium">{event.title}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
                      </span>
                      {getEventTypeBadge(event.event_type)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        {/* Add Event Form */}
        {showForm && canAddEvents && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Add Academic Event</CardTitle>
              <CardDescription>Add important dates to the academic calendar</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Event Title</Label>
                  <Input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Mid-term Examinations"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="eventType">Event Type</Label>
                  <Select value={eventType} onValueChange={setEventType} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exam">Exam (Leave Restricted)</SelectItem>
                      <SelectItem value="expert-session">Expert Session (Leave Restricted)</SelectItem>
                      <SelectItem value="important-event">Important Event (Leave Restricted)</SelectItem>
                      <SelectItem value="deadline">Assignment Deadline</SelectItem>
                      <SelectItem value="holiday">Holiday</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Additional details about the event..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Adding...' : 'Add Event'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Events List */}
        <div className="grid gap-4">
          {events.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No events scheduled</p>
              </CardContent>
            </Card>
          ) : (
            events
              .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
              .map((event) => (
                <Card key={event._id} className={isRestrictedEventType(event.event_type) ? 'border-orange-200' : ''}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {event.title}
                          {isRestrictedEventType(event.event_type) && (
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                          )}
                        </CardTitle>
                        <CardDescription>
                          {new Date(event.start_date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                          {event.start_date !== event.end_date && (
                            <span> - {new Date(event.end_date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}</span>
                          )}
                        </CardDescription>
                        {event.created_by && (
                          <CardDescription className="text-xs">
                            Added by {event.created_by.full_name}
                          </CardDescription>
                        )}
                      </div>
                      {getEventTypeBadge(event.event_type)}
                    </div>
                  </CardHeader>
                  {event.description && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                      {isRestrictedEventType(event.event_type) && (
                        <p className="text-xs text-orange-600 mt-2 font-medium">
                          ⚠️ Leave applications will be auto-rejected for this date (except medical emergencies)
                        </p>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))
          )}
        </div>
      </main>
    </div>
  );
};

export default SimpleAcademicCalendar;
