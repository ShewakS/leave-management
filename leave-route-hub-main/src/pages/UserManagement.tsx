import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Users, Search, RefreshCw, LogOut } from 'lucide-react';

interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  department?: string;
  section?: string;
}

interface User {
  _id: string;
  email: string;
  full_name: string;
  role: string;
  department: string;
  section: string;
  created_at: string;
}

const UserManagement = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => {
    // Get user from localStorage
    const userData = localStorage.getItem('auth_user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.role !== 'hod' && parsedUser.role !== 'advisor') {
        window.location.href = '/';
        return;
      }
      setUser(parsedUser);
      fetchUsers();
    } else {
      window.location.href = '/';
    }
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

      const params = new URLSearchParams();
      if (roleFilter) params.append('role', roleFilter);

      const response = await fetch(`${API_BASE_URL}/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    window.location.href = '/';
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      student: { label: 'Student', className: 'bg-blue-100 text-blue-800' },
      advisor: { label: 'Advisor', className: 'bg-green-100 text-green-800' },
      hod: { label: 'HOD', className: 'bg-purple-100 text-purple-800' },
    };

    const config = roleConfig[role] || { label: role, className: 'bg-gray-100 text-gray-800' };

    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Sri Eshwar User Management</h1>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => window.location.href = '/hod'}>
              <Users className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
            <div className="text-sm">
              <p className="font-medium">{user.full_name}</p>
              <p className="text-muted-foreground">{user.department} · {user.role.toUpperCase()}</p>
            </div>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Registered Users - Sri Eshwar College of Engineering
            </CardTitle>
            <CardDescription>
              {user.role === 'hod'
                ? `View all users in ${user.department} department`
                : `View students in ${user.department} department, Section ${user.section}`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or department..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Roles</SelectItem>
                  <SelectItem value="student">Students</SelectItem>
                  <SelectItem value="advisor">Advisors</SelectItem>
                  <SelectItem value="hod">HODs</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={fetchUsers} disabled={loading} variant="outline">
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            <div className="grid gap-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {users.length === 0 ? 'No users found' : 'No users match your search'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredUsers.map((user) => (
                  <Card key={user._id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{user.full_name}</h3>
                            {getRoleBadge(user.role)}
                          </div>
                          <p className="text-muted-foreground mb-1">{user.email}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Department: <span className="font-medium text-foreground">{user.department}</span></span>
                            {user.section && (
                              <span>Section: <span className="font-medium text-foreground">{user.section}</span></span>
                            )}
                            <span>Joined: {new Date(user.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default UserManagement;
