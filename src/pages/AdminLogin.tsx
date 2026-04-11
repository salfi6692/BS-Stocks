import * as React from 'react';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signInWithEmailAndPassword, auth, sendPasswordResetEmail } from '../firebase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/admin";

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Logged in successfully');
      navigate(from, { replace: true });
    } catch (error: any) {
      console.error("Login error:", error);
      setErrorCount(prev => prev + 1);
      
      let message = 'Failed to login. Please check your credentials.';
      
      if (error.code === 'auth/invalid-credential') {
        message = 'Invalid email or password. If you previously used Google Login, please see the troubleshooting below.';
      } else if (error.code === 'auth/user-not-found') {
        message = 'User account not found.';
      } else if (error.code === 'auth/wrong-password') {
        message = 'Incorrect password.';
      } else if (error.code === 'auth/operation-not-allowed') {
        message = 'Email/Password login is not enabled in Firebase Console.';
      }
      
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error('Please enter your email first');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset email');
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md shadow-xl border-none bg-card/50 backdrop-blur-sm">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <LogIn className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Admin Login</CardTitle>
          <CardDescription>
            Enter your credentials to access the dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="admin@example.com" 
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button 
                  type="button" 
                  onClick={handleForgotPassword}
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="password" 
                  type="password" 
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-11 font-bold" disabled={loading}>
              {loading ? 'Logging in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2 text-center text-sm text-muted-foreground">
          <p>Only authorized administrators can access this area.</p>
        </CardFooter>
      </Card>

      {errorCount > 0 && (
        <div className="mt-8 w-full max-w-md p-6 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl space-y-4">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-bold">
            <AlertCircle className="h-5 w-5" />
            <h3>Troubleshooting Login Issues</h3>
          </div>
          <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-2 list-disc pl-4">
            <li>
              <strong>Enable Email/Password:</strong> Go to your <a href="https://console.firebase.google.com/" target="_blank" className="underline font-bold">Firebase Console</a> &gt; Authentication &gt; Sign-in method and ensure <strong>Email/Password</strong> is enabled.
            </li>
            <li>
              <strong>Reset Account:</strong> If you previously used Google Login with this email, you must delete the user from the Firebase Authentication tab and refresh this page to reset the password.
            </li>
            <li>
              <strong>Check Credentials:</strong> Ensure you are using <code>salfi6692@gmail.com</code> and the password you provided.
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
