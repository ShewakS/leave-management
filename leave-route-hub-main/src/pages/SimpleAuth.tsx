import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const SimpleAuth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('');
  const [department, setDepartment] = useState('');
  const [section, setSection] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      
      if (isLogin) {
        // Sign In
        const response = await fetch(`${API_BASE_URL}/auth/signin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();
        
        if (response.ok) {
          // Store auth data
          localStorage.setItem('auth_token', data.token);
          localStorage.setItem('auth_user', JSON.stringify({
            id: data.user._id,
            email: data.user.email,
            full_name: data.user.full_name,
            role: data.user.role,
            department: data.user.department,
            section: data.user.section
          }));
          
          toast.success('Signed in successfully!');
          
          // Redirect based on role
          if (data.user.role === 'student') {
            window.location.href = '/student';
          } else if (data.user.role === 'advisor') {
            window.location.href = '/advisor';
          } else if (data.user.role === 'hod') {
            window.location.href = '/hod';
          }
        } else {
          toast.error(data.message || 'Failed to sign in');
        }
      } else {
        // Sign Up
        if (!role) {
          toast.error('Please select a role');
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/auth/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
            full_name: fullName,
            role,
            department,
            section
          }),
        });

        const data = await response.json();
        
        if (response.ok) {
          // Store auth data
          localStorage.setItem('auth_token', data.token);
          localStorage.setItem('auth_user', JSON.stringify({
            id: data.user._id,
            email: data.user.email,
            full_name: data.user.full_name,
            role: data.user.role,
            department: data.user.department,
            section: data.user.section
          }));
          
          toast.success('Account created successfully!');
          
          // Redirect based on role
          if (data.user.role === 'student') {
            window.location.href = '/student';
          } else if (data.user.role === 'advisor') {
            window.location.href = '/advisor';
          } else if (data.user.role === 'hod') {
            window.location.href = '/hod';
          }
        } else {
          toast.error(data.message || 'Failed to create account');
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to Sri Eshwar's Portal</CardTitle>
          <CardDescription>
            {isLogin ? 'Sign in to Sri Eshwar\'s Leave Management System' : 'Register for Sri Eshwar\'s Leave Management System'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={role} onValueChange={setRole} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="advisor">Advisor</SelectItem>
                      <SelectItem value="hod">HOD (Head of Department)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="department">Department</Label>
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger id="department">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CSE">CSE</SelectItem>
                      <SelectItem value="IT">IT</SelectItem>
                      <SelectItem value="ECE">ECE</SelectItem>
                      <SelectItem value="AIDS">AIDS</SelectItem>
                      <SelectItem value="AIML">AIML</SelectItem>
                      <SelectItem value="EEE">EEE</SelectItem>
                      <SelectItem value="MECH">MECH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="section">Section</Label>
                  <Select value={section} onValueChange={setSection}>
                    <SelectTrigger id="section">
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A</SelectItem>
                      <SelectItem value="B">B</SelectItem>
                      <SelectItem value="C">C</SelectItem>
                      <SelectItem value="D">D</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@university.edu"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Sign Up'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-600 hover:underline text-sm"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SimpleAuth;
