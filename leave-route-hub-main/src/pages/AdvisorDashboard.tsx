import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Calendar, CheckCircle, LogOut, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  advisor_comment: string | null;
  created_at: string;
}

const AdvisorDashboard = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<LeaveApplication[]>([]);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchApplications();
      subscribeToApplications();
    }
  }, [profile]);

  // Real-time updates can be implemented later with WebSocket or polling
  const subscribeToApplications = () => {
    // For now, we'll refresh data periodically
    const interval = setInterval(() => {
      fetchApplications();
    }, 30000); // Refresh every 30 seconds

    return () => {
      clearInterval(interval);
    };
  };

  const fetchApplications = async () => {
    try {
      const data = await apiClient.getLeaveApplications({
        status: 'pending_advisor,advisor_approved,advisor_rejected'
      });
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_advisor':
        return (
          <Badge className="bg-warning text-warning-foreground">
            Pending Review
          </Badge>
        );
      case 'advisor_approved':
        return (
          <Badge className="bg-success text-success-foreground">
            Approved by You
          </Badge>
        );
      case 'advisor_rejected':
        return (
          <Badge className="bg-destructive text-destructive-foreground">
            Rejected by You
          </Badge>
        );
      default:
        return (
          <Badge className="bg-secondary text-secondary-foreground">
            {status}
          </Badge>
        );
    }
  };

  const handleReview = async (applicationId: string, approved: boolean) => {
    if (!comment.trim()) {
      toast.error('Please provide a comment');
      return;
    }

    setLoading(true);

    try {
      await apiClient.reviewLeaveApplication(applicationId, {
        approved,
        comment,
        reviewer_type: 'advisor'
      });

      toast.success(approved ? 'Application approved!' : 'Application rejected');
      setSelectedApp(null);
      setComment('');
      fetchApplications();
    } catch (error) {
      console.error('Error reviewing application:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      toast.error(`Failed to process application: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Advisor Portal</h1>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/calendar')}>
              <Calendar className="mr-2 h-4 w-4" />
              Calendar
            </Button>
            <div className="text-sm">
              <p className="font-medium">{profile?.full_name}</p>
              <p className="text-muted-foreground">{profile?.department}</p>
            </div>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-6">Leave Applications</h2>

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
                              className="bg-success hover:bg-success/90"
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

export default AdvisorDashboard;
