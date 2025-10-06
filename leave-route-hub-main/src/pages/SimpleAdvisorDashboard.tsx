import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Calendar, CheckCircle, LogOut, XCircle } from 'lucide-react';

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
  student_id: {
    _id: string;
    full_name: string;
    email: string;
    department: string;
  };
  advisor_comment?: string;
  created_at: string;
}

const SimpleAdvisorDashboard = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [applications, setApplications] = useState<LeaveApplication[]>([]);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [sectionEditing, setSectionEditing] = useState(false);
  const [newSection, setNewSection] = useState('');

  useEffect(() => {
    // Get user from localStorage
    const userData = localStorage.getItem('auth_user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.role !== 'advisor') {
        window.location.href = '/';
        return;
      }
      setUser(parsedUser);
      setNewSection(parsedUser.section || '');
      fetchApplications();
    } else {
      window.location.href = '/';
    }
  }, []);

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      
      const response = await fetch(`${API_BASE_URL}/leave-applications?status=pending_advisor,advisor_approved,advisor_rejected`, {
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

  const handleReview = async (applicationId: string, approved: boolean) => {
    if (!comment.trim()) {
      toast.error('Please provide a comment');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('auth_token');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      
      const response = await fetch(`${API_BASE_URL}/leave-applications/${applicationId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          approved,
          comment,
        }),
      });

      if (response.ok) {
        toast.success(approved ? 'Application approved!' : 'Application rejected');
        setSelectedApp(null);
        setComment('');
        fetchApplications();
      } else {
        const data = await response.json();
        toast.error(data.message || 'Failed to process application');
      }
    } catch (error) {
      console.error('Error reviewing application:', error);
      toast.error('Failed to process application');
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    window.location.href = '/';
  };

  const updateSection = async () => {
    try {
      if (!newSection.trim()) return toast.error('Section cannot be empty');
      const token = localStorage.getItem('auth_token');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      const res = await fetch(`${API_BASE_URL}/users/me/section`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ section: newSection.trim() })
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.message || 'Failed to update section');
      toast.success('Section updated');
      setSectionEditing(false);
      setUser(data.user as any);
      const authUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
      localStorage.setItem('auth_user', JSON.stringify({ ...authUser, section: data.user.section }));
      // Refetch to apply visibility constraints
      fetchApplications();
    } catch (e) {
      toast.error('Network error');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending_advisor: { label: 'Pending Review', className: 'bg-yellow-100 text-yellow-800' },
      advisor_approved: { label: 'Approved by You', className: 'bg-green-100 text-green-800' },
      advisor_rejected: { label: 'Rejected by You', className: 'bg-red-100 text-red-800' },
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
          <h1 className="text-2xl font-bold text-primary">Sri Eshwar Advisor Portal</h1>
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
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold">Leave Applications</h2>
          <div className="flex items-center gap-2">
            {!sectionEditing ? (
              <>
                <span className="text-sm text-muted-foreground">My Section:</span>
                <span className="font-medium">{user.section || 'Not set'}</span>
                <Button variant="outline" size="sm" onClick={() => setSectionEditing(true)}>Change</Button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Input value={newSection} onChange={(e) => setNewSection(e.target.value)} placeholder="e.g., A" className="w-24" />
                <Button size="sm" onClick={updateSection}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => { setSectionEditing(false); setNewSection(user.section || ''); }}>Cancel</Button>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4">
          {applications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No applications found</p>
              </CardContent>
            </Card>
          ) : (
            applications.map((app) => (
              <Card key={app._id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>
                        {app.student_id.full_name} - <span className="capitalize">{app.leave_type}</span> Leave
                      </CardTitle>
                      <CardDescription>
                        {app.student_id.email} | {app.student_id.department}
                      </CardDescription>
                      <CardDescription className="mt-1">
                        {new Date(app.start_date).toLocaleDateString()} - {new Date(app.end_date).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    {getStatusBadge(app.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium">Reason:</p>
                      <p className="text-sm text-muted-foreground">{app.reason}</p>
                    </div>

                    {app.status === 'pending_advisor' ? (
                      selectedApp === app._id ? (
                        <div className="space-y-4 p-4 bg-secondary/50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium mb-2">Your Comment:</p>
                            <Textarea
                              placeholder="Add your comment..."
                              value={comment}
                              onChange={(e) => setComment(e.target.value)}
                              rows={3}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleReview(app._id, true)}
                              disabled={loading}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Approve
                            </Button>
                            <Button
                              onClick={() => handleReview(app._id, false)}
                              disabled={loading}
                              variant="destructive"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Reject
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSelectedApp(null);
                                setComment('');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button onClick={() => setSelectedApp(app._id)}>Review Application</Button>
                      )
                    ) : (
                      app.advisor_comment && (
                        <div className="p-3 bg-accent/10 rounded-lg">
                          <p className="text-sm font-medium">Your Comment:</p>
                          <p className="text-sm text-muted-foreground">{app.advisor_comment}</p>
                        </div>
                      )
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

export default SimpleAdvisorDashboard;
