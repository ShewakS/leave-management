import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Calendar, FileText, LogOut, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LeaveApplication {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  advisor_comment: string | null;
  hod_comment: string | null;
  created_at: string;
}

const StudentDashboard = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<LeaveApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  const [leaveType, setLeaveType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (profile) {
      fetchApplications();
      subscribeToApplications();
    }
  }, [profile]);

  const subscribeToApplications = () => {
    const channel = supabase
      .channel('leave_applications_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leave_applications',
          filter: `student_id=eq.${profile?.id}`,
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
        .select('*')
        .eq('student_id', profile?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('leave_applications')
        .insert({
          student_id: profile?.id,
          leave_type: leaveType,
          start_date: startDate,
          end_date: endDate,
          reason,
          status: 'pending_advisor',
        });

      if (error) throw error;

      toast.success('Leave application submitted successfully!');
      setShowForm(false);
      setLeaveType('');
      setStartDate('');
      setEndDate('');
      setReason('');
      fetchApplications();
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error('Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      pending_advisor: { variant: 'default', label: 'Pending Advisor' },
      advisor_approved: { variant: 'default', label: 'Pending HOD' },
      advisor_rejected: { variant: 'destructive', label: 'Rejected by Advisor' },
      hod_approved: { variant: 'default', label: 'Approved' },
      hod_rejected: { variant: 'destructive', label: 'Rejected by HOD' },
    };

    const config = variants[status] || { variant: 'default', label: status };
    
    return (
      <Badge 
        className={
          status === 'hod_approved' 
            ? 'bg-success text-success-foreground' 
            : config.variant === 'destructive' 
            ? 'bg-destructive text-destructive-foreground'
            : 'bg-warning text-warning-foreground'
        }
      >
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Student Portal</h1>
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
              <Card key={app.id}>
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

export default StudentDashboard;
