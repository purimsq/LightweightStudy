import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

  // Redirect to dashboard when user becomes authenticated
  useEffect(() => {
    console.log("Login page - isAuthenticated:", isAuthenticated, "authLoading:", authLoading);
    if (isAuthenticated && !authLoading) {
      console.log("Redirecting to dashboard...");
      navigate("/dashboard");
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      console.log("Calling login function...");
      await login(formData.email, formData.password);
      console.log("Login function completed successfully");
      
      toast({
        title: "Welcome back!",
        description: `Hello! You've successfully logged in.`,
      });

      // Give the auth state a moment to update, then navigate
      setTimeout(() => {
        console.log("Navigating to dashboard after timeout...");
        navigate("/dashboard");
      }, 500);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Login failed";
      setError(errorMessage);
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading if auth is still loading or if user is authenticated (redirecting)
  if (authLoading || isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Study Icons */}
          <div className="absolute top-16 left-8 text-3xl opacity-20 animate-bounce" style={{ animationDelay: '0s', animationDuration: '3s' }}>📚</div>
          <div className="absolute top-20 right-12 text-4xl opacity-25 animate-bounce" style={{ animationDelay: '1s', animationDuration: '4s' }}>✏️</div>
          <div className="absolute top-24 left-1/4 text-2xl opacity-20 animate-bounce" style={{ animationDelay: '2s', animationDuration: '3.5s' }}>🎓</div>
          <div className="absolute top-28 right-1/3 text-3xl opacity-25 animate-bounce" style={{ animationDelay: '0.5s', animationDuration: '4.5s' }}>💡</div>
          <div className="absolute top-32 left-1/3 text-2xl opacity-20 animate-bounce" style={{ animationDelay: '1.5s', animationDuration: '3.2s' }}>📝</div>
          <div className="absolute top-40 left-12 text-3xl opacity-20 animate-bounce" style={{ animationDelay: '2.5s', animationDuration: '3.8s' }}>🧠</div>
          <div className="absolute top-44 right-20 text-2xl opacity-25 animate-bounce" style={{ animationDelay: '0.8s', animationDuration: '4.2s' }}>📖</div>
          <div className="absolute top-48 left-1/2 text-3xl opacity-20 animate-bounce" style={{ animationDelay: '1.8s', animationDuration: '3.6s' }}>🎯</div>
          <div className="absolute top-52 right-1/4 text-2xl opacity-25 animate-bounce" style={{ animationDelay: '2.2s', animationDuration: '4.1s' }}>⭐</div>
          <div className="absolute bottom-32 right-12 text-4xl opacity-20 animate-bounce" style={{ animationDelay: '2.5s', animationDuration: '3.8s' }}>🧠</div>
          <div className="absolute bottom-36 left-24 text-3xl opacity-25 animate-bounce" style={{ animationDelay: '0.8s', animationDuration: '4.2s' }}>📖</div>
          <div className="absolute bottom-40 right-20 text-3xl opacity-20 animate-bounce" style={{ animationDelay: '1.8s', animationDuration: '3.6s' }}>🎯</div>
          <div className="absolute bottom-44 left-12 text-4xl opacity-25 animate-bounce" style={{ animationDelay: '2.2s', animationDuration: '4.1s' }}>⭐</div>
          
          {/* Floating shapes */}
          <div className="absolute top-1/2 left-8 w-5 h-5 bg-green-200 rounded-full opacity-25 animate-pulse" style={{ animationDelay: '2.1s' }}></div>
          <div className="absolute top-1/2 right-8 w-6 h-6 bg-yellow-200 rounded-full opacity-20 animate-pulse" style={{ animationDelay: '0.9s' }}></div>
          <div className="absolute bottom-1/3 left-1/4 w-4 h-4 bg-red-200 rounded-full opacity-30 animate-pulse" style={{ animationDelay: '1.5s' }}></div>
          <div className="absolute bottom-1/3 right-1/4 w-8 h-8 bg-orange-200 rounded-full opacity-25 animate-pulse" style={{ animationDelay: '2.6s' }}></div>
        </div>
        <div className="flex flex-col items-center space-y-4 relative z-10">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden animate-pulse">
            <img 
              src="/images/Lightweight-logo.png.jpg" 
              alt="Lightweight Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <p className="text-gray-600">
            {isAuthenticated ? "Redirecting to dashboard..." : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Top Row - Study Icons */}
        <div className="absolute top-16 left-8 text-3xl opacity-20 animate-bounce" style={{ animationDelay: '0s', animationDuration: '3s' }}>📚</div>
        <div className="absolute top-20 right-12 text-4xl opacity-25 animate-bounce" style={{ animationDelay: '1s', animationDuration: '4s' }}>✏️</div>
        <div className="absolute top-24 left-1/4 text-2xl opacity-20 animate-bounce" style={{ animationDelay: '2s', animationDuration: '3.5s' }}>🎓</div>
        <div className="absolute top-28 right-1/3 text-3xl opacity-25 animate-bounce" style={{ animationDelay: '0.5s', animationDuration: '4.5s' }}>💡</div>
        <div className="absolute top-32 left-1/3 text-2xl opacity-20 animate-bounce" style={{ animationDelay: '1.5s', animationDuration: '3.2s' }}>📝</div>
        
        {/* Second Row */}
        <div className="absolute top-40 left-12 text-3xl opacity-20 animate-bounce" style={{ animationDelay: '2.5s', animationDuration: '3.8s' }}>🧠</div>
        <div className="absolute top-44 right-20 text-2xl opacity-25 animate-bounce" style={{ animationDelay: '0.8s', animationDuration: '4.2s' }}>📖</div>
        <div className="absolute top-48 left-1/2 text-3xl opacity-20 animate-bounce" style={{ animationDelay: '1.8s', animationDuration: '3.6s' }}>🎯</div>
        <div className="absolute top-52 right-1/4 text-2xl opacity-25 animate-bounce" style={{ animationDelay: '2.2s', animationDuration: '4.1s' }}>⭐</div>
        
        {/* Third Row */}
        <div className="absolute top-60 left-16 text-2xl opacity-20 animate-bounce" style={{ animationDelay: '0.3s', animationDuration: '3.9s' }}>🔬</div>
        <div className="absolute top-64 right-16 text-3xl opacity-25 animate-bounce" style={{ animationDelay: '1.2s', animationDuration: '4.3s' }}>📊</div>
        <div className="absolute top-68 left-1/4 text-2xl opacity-20 animate-bounce" style={{ animationDelay: '2.7s', animationDuration: '3.7s' }}>💻</div>
        <div className="absolute top-72 right-1/3 text-3xl opacity-25 animate-bounce" style={{ animationDelay: '0.9s', animationDuration: '4.4s' }}>📱</div>
        
        {/* Fourth Row */}
        <div className="absolute top-80 left-20 text-2xl opacity-20 animate-bounce" style={{ animationDelay: '1.6s', animationDuration: '3.4s' }}>🎨</div>
        <div className="absolute top-84 right-24 text-3xl opacity-25 animate-bounce" style={{ animationDelay: '2.1s', animationDuration: '4.6s' }}>🎵</div>
        <div className="absolute top-88 left-1/3 text-2xl opacity-20 animate-bounce" style={{ animationDelay: '0.7s', animationDuration: '3.8s' }}>🌍</div>
        <div className="absolute top-92 right-1/4 text-3xl opacity-25 animate-bounce" style={{ animationDelay: '2.9s', animationDuration: '4.1s' }}>🚀</div>
        
        {/* Bottom Row */}
        <div className="absolute bottom-32 right-12 text-4xl opacity-20 animate-bounce" style={{ animationDelay: '2.5s', animationDuration: '3.8s' }}>🧠</div>
        <div className="absolute bottom-36 left-24 text-3xl opacity-25 animate-bounce" style={{ animationDelay: '0.8s', animationDuration: '4.2s' }}>📖</div>
        <div className="absolute bottom-40 right-20 text-3xl opacity-20 animate-bounce" style={{ animationDelay: '1.8s', animationDuration: '3.6s' }}>🎯</div>
        <div className="absolute bottom-44 left-12 text-4xl opacity-25 animate-bounce" style={{ animationDelay: '2.2s', animationDuration: '4.1s' }}>⭐</div>
        <div className="absolute bottom-48 right-1/3 text-2xl opacity-20 animate-bounce" style={{ animationDelay: '0.4s', animationDuration: '3.3s' }}>🔍</div>
        <div className="absolute bottom-52 left-1/3 text-3xl opacity-25 animate-bounce" style={{ animationDelay: '1.9s', animationDuration: '4.5s' }}>💎</div>
        
        {/* More Bottom Elements */}
        <div className="absolute bottom-64 right-16 text-2xl opacity-20 animate-bounce" style={{ animationDelay: '2.8s', animationDuration: '3.9s' }}>🎪</div>
        <div className="absolute bottom-68 left-20 text-3xl opacity-25 animate-bounce" style={{ animationDelay: '0.6s', animationDuration: '4.2s' }}>🎭</div>
        <div className="absolute bottom-72 right-1/4 text-2xl opacity-20 animate-bounce" style={{ animationDelay: '1.4s', animationDuration: '3.5s' }}>🎨</div>
        <div className="absolute bottom-76 left-1/4 text-3xl opacity-25 animate-bounce" style={{ animationDelay: '2.3s', animationDuration: '4.3s' }}>🎪</div>
        
        {/* Floating geometric shapes - More variety */}
        <div className="absolute top-40 right-8 w-8 h-8 bg-purple-200 rounded-full opacity-30 animate-pulse" style={{ animationDelay: '1.2s' }}></div>
        <div className="absolute top-60 left-8 w-6 h-6 bg-pink-200 rounded-full opacity-25 animate-pulse" style={{ animationDelay: '2.8s' }}></div>
        <div className="absolute top-80 right-12 w-10 h-10 bg-blue-200 rounded-full opacity-20 animate-pulse" style={{ animationDelay: '0.3s' }}></div>
        <div className="absolute bottom-40 right-16 w-10 h-10 bg-blue-200 rounded-full opacity-20 animate-pulse" style={{ animationDelay: '0.3s' }}></div>
        <div className="absolute bottom-60 left-16 w-7 h-7 bg-indigo-200 rounded-full opacity-30 animate-pulse" style={{ animationDelay: '1.7s' }}></div>
        <div className="absolute top-1/2 left-8 w-5 h-5 bg-green-200 rounded-full opacity-25 animate-pulse" style={{ animationDelay: '2.1s' }}></div>
        <div className="absolute top-1/2 right-8 w-6 h-6 bg-yellow-200 rounded-full opacity-20 animate-pulse" style={{ animationDelay: '0.9s' }}></div>
        <div className="absolute bottom-1/3 left-1/4 w-4 h-4 bg-red-200 rounded-full opacity-30 animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute bottom-1/3 right-1/4 w-8 h-8 bg-orange-200 rounded-full opacity-25 animate-pulse" style={{ animationDelay: '2.6s' }}></div>
        
        {/* More geometric shapes */}
        <div className="absolute top-1/4 left-1/6 w-3 h-3 bg-purple-300 rounded-full opacity-20 animate-pulse" style={{ animationDelay: '0.7s' }}></div>
        <div className="absolute top-1/3 right-1/6 w-4 h-4 bg-pink-300 rounded-full opacity-25 animate-pulse" style={{ animationDelay: '1.8s' }}></div>
        <div className="absolute bottom-1/4 left-1/5 w-5 h-5 bg-blue-300 rounded-full opacity-20 animate-pulse" style={{ animationDelay: '2.4s' }}></div>
        <div className="absolute bottom-1/3 right-1/5 w-3 h-3 bg-indigo-300 rounded-full opacity-30 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        
        {/* Subtle gradient orbs - More of them */}
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-gradient-to-r from-purple-200 to-pink-200 rounded-full opacity-10 blur-xl animate-pulse" style={{ animationDelay: '0s', animationDuration: '6s' }}></div>
        <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-gradient-to-r from-blue-200 to-indigo-200 rounded-full opacity-10 blur-xl animate-pulse" style={{ animationDelay: '3s', animationDuration: '8s' }}></div>
        <div className="absolute top-1/2 right-1/6 w-24 h-24 bg-gradient-to-r from-green-200 to-teal-200 rounded-full opacity-8 blur-xl animate-pulse" style={{ animationDelay: '1.5s', animationDuration: '7s' }}></div>
        <div className="absolute bottom-1/2 left-1/6 w-28 h-28 bg-gradient-to-r from-yellow-200 to-orange-200 rounded-full opacity-8 blur-xl animate-pulse" style={{ animationDelay: '4.5s', animationDuration: '9s' }}></div>
        
        {/* Floating lines and shapes */}
        <div className="absolute top-1/3 left-1/12 w-1 h-16 bg-gradient-to-b from-purple-300 to-transparent opacity-20 animate-pulse" style={{ animationDelay: '2.2s', animationDuration: '4s' }}></div>
        <div className="absolute bottom-1/3 right-1/12 w-1 h-20 bg-gradient-to-t from-pink-300 to-transparent opacity-20 animate-pulse" style={{ animationDelay: '1.1s', animationDuration: '5s' }}></div>
        <div className="absolute top-2/3 left-1/8 w-16 h-1 bg-gradient-to-r from-blue-300 to-transparent opacity-15 animate-pulse" style={{ animationDelay: '3.2s', animationDuration: '6s' }}></div>
        <div className="absolute bottom-2/3 right-1/8 w-12 h-1 bg-gradient-to-l from-indigo-300 to-transparent opacity-15 animate-pulse" style={{ animationDelay: '0.8s', animationDuration: '4.5s' }}></div>
      </div>
      <div className="w-full max-w-md relative z-10">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden">
              <img 
                src="/images/Lightweight-logo.png.jpg" 
                alt="Lightweight Logo" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to your StudyCompanion account</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-center">Sign In</CardTitle>
            <CardDescription className="text-center">
              Enter your email and password to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{" "}
                <button
                  onClick={() => navigate("/signup")}
                  className="text-purple-600 hover:text-purple-700 font-medium"
                  disabled={isLoading}
                >
                  Sign up
                </button>
              </p>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
