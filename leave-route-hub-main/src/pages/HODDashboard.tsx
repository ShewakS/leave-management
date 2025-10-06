import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Calendar, CheckCircle, LogOut, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LeaveApplication {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  advisor_comment: string;
  student_id: string;
  profiles: {
    full_name: string;
    email: string;
    department: string;
  };
}

const HODDashboard = () => {
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

  const subscribeToApplications = () => {
    const channel = supabase
      .channel('hod_leave_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leave_applications',
        },
        () => {
          fetchApplications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('leave_applications')
        .select(`
          *,
          profiles!leave_applications_student_id_fkey (
            full_name,
            email,
            department
          )
        `)
        .eq('status', 'advisor_approved')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
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
      const { error } = await supabase
        .from('leave_applications')
        .update({
          status: approved ? 'hod_approved' : 'hod_rejected',
          hod_comment: comment,
          hod_reviewed_at: new Date().toISOString(),
          hod_reviewed_by: profile?.id,
        })
        .eq('id', applicationId);

      if (error) throw error;

      toast.success(approved ? 'Application approved!' : 'Application rejected');
      setSelectedApp(null);
      setComment('');
      fetchApplications();
    } catch (error) {
      console.error('Error reviewing application:', error);
      toast.error('Failed to process application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">HOD Portal</h1>
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
        <h2 className="text-3xl font-bold mb-6">Advisor-Approved Applications</h2>

        <div className="grid gap-4">
          {applications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No applications awaiting final approval</p>
              </CardContent>
            </Card>
          ) : (
            applications.map((app) => (
              <Card key={app.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>
                        {app.profiles.full_name} - <span className="capitalize">{app.leave_type}</span> Leave
                      </CardTitle>
                      <CardDescription>
                        {app.profiles.email} | {app.profiles.department}
                      </CardDescription>
                      <CardDescription className="mt-1">
                        {new Date(app.start_date).toLocaleDateString()} - {new Date(app.end_date).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Badge className="bg-accent text-accent-foreground">Advisor Approved</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium">Reason:</p>
                      <p className="text-sm text-muted-foreground">{app.reason}</p>
                    </div>

                    <div className="p-3 bg-accent/10 rounded-lg">
                      <p className="text-sm font-medium">Advisor's Comment:</p>
                      <p className="text-sm text-muted-foreground">{app.advisor_comment}</p>
                    </div>

                    {selectedApp === app.id ? (
                      <div className="space-y-4 p-4 bg-secondary/50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium mb-2">Your Comment:</p>
                          <Textarea
                            placeholder="Add your final comment..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={3}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleReview(app.id, true)}
                            disabled={loading}
                            className="bg-success hover:bg-success/90"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Final Approve
                          </Button>
                          <Button
                            onClick={() => handleReview(app.id, false)}
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
                      <Button onClick={() => setSelectedApp(app.id)}>Review Application</Button>
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

export default HODDashboard;
