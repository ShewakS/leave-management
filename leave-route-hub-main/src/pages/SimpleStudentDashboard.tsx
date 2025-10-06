import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Calendar, FileText, LogOut, Plus } from 'lucide-react';

interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  department?: string;
  section?: string;
}

interface LeaveApplication {
  _id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  advisor_comment?: string;
  hod_comment?: string;
  created_at: string;
}

const SimpleStudentDashboard = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [applications, setApplications] = useState<LeaveApplication[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [leaveType, setLeaveType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    // Get user from localStorage
    const userData = localStorage.getItem('auth_user');
    if (userData) {
      setUser(JSON.parse(userData));
      fetchApplications();
    } else {
      // Redirect to login if no user
      window.location.href = '/';
    }
  }, []);

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      
      const response = await fetch(`${API_BASE_URL}/leave-applications`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setApplications(data);
      } else {
        toast.error('Failed to load applications');
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('auth_token');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      
      const response = await fetch(`${API_BASE_URL}/leave-applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          leave_type: leaveType,
          start_date: startDate,
          end_date: endDate,
          reason,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.auto_rejected) {
          toast.error(`Application auto-rejected: ${data.message}`);
          if (data.conflicting_events) {
            const eventNames = data.conflicting_events.map(e => e.title).join(', ');
            toast.error(`Conflicting events: ${eventNames}`, { duration: 5000 });
          }
        } else {
          toast.success('Leave application submitted successfully!');
          if (data.system_note) {
            toast.warning('Note: Your application conflicts with academic events', { duration: 4000 });
          }
        }
        
        setShowForm(false);
        setLeaveType('');
        setStartDate('');
        setEndDate('');
        setReason('');
        fetchApplications();
      } else {
        toast.error(data.message || 'Failed to submit application');
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error('Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    window.location.href = '/';
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending_advisor: { label: 'Pending Advisor', className: 'bg-yellow-100 text-yellow-800' },
      advisor_approved: { label: 'Pending HOD', className: 'bg-blue-100 text-blue-800' },
      advisor_rejected: { label: 'Rejected by Advisor', className: 'bg-red-100 text-red-800' },
      hod_approved: { label: 'Approved', className: 'bg-green-100 text-green-800' },
      hod_rejected: { label: 'Rejected by HOD', className: 'bg-red-100 text-red-800' },
    };

    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Student Portal</h1>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => window.location.href = '/calendar'}>
              <Calendar className="mr-2 h-4 w-4" />
              Calendar
            </Button>
            <div className="text-sm">
              <p className="font-medium">{user.full_name}</p>
              <p className="text-muted-foreground">{user.department} {user.section ? `· Sec ${user.section}` : ''}</p>
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
          <h2 className="text-3xl font-bold">My Leave Applications</h2>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-2 h-4 w-4" />
            New Application
          </Button>
        </div>

        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Submit Leave Application</CardTitle>
              <CardDescription>Fill in the details for your leave request</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="leaveType">Leave Type</Label>
                  <Select value={leaveType} onValueChange={setLeaveType} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sick">Sick Leave</SelectItem>
                      <SelectItem value="casual">Casual Leave</SelectItem>
                      <SelectItem value="emergency">Emergency Leave</SelectItem>
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
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea
                    id="reason"
                    placeholder="Provide details about your leave request..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                    rows={4}
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Submitting...' : 'Submit Application'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4">
          {applications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No leave applications yet</p>
              </CardContent>
            </Card>
          ) : (
            applications.map((app) => (
              <Card key={app._id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="capitalize">{app.leave_type} Leave</CardTitle>
                      <CardDescription>
                        {new Date(app.start_date).toLocaleDateString()} - {new Date(app.end_date).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    {getStatusBadge(app.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium">Reason:</p>
                      <p className="text-sm text-muted-foreground">{app.reason}</p>
                    </div>
                    {app.advisor_comment && (
                      <div>
                        <p className="text-sm font-medium">Advisor Comment:</p>
                        <p className="text-sm text-muted-foreground">{app.advisor_comment}</p>
                      </div>
                    )}
                    {app.hod_comment && (
                      <div>
                        <p className="text-sm font-medium">HOD Comment:</p>
                        <p className="text-sm text-muted-foreground">{app.hod_comment}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default SimpleStudentDashboard;
