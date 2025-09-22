import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function Signup() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { signup, isAuthenticated, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    phone: "",
    bio: "",
    location: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Redirect to dashboard when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError("");
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return false;
    }
    if (formData.username.length < 3) {
      setError("Username must be at least 3 characters long");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await signup({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        name: formData.name,
        phone: formData.phone || undefined,
        bio: formData.bio || undefined,
        location: formData.location || undefined,
      });

      setSuccess(true);
      toast({
        title: "Account Created!",
        description: `Welcome to StudyCompanion!`,
      });

      // Give the auth state a moment to update, then navigate
      setTimeout(() => {
        navigate("/dashboard");
      }, 500);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Signup failed";
      setError(errorMessage);
      toast({
        title: "Signup Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Celebration Icons */}
          <div className="absolute top-16 left-8 text-3xl opacity-20 animate-bounce" style={{ animationDelay: '0s', animationDuration: '3s' }}>🎉</div>
          <div className="absolute top-20 right-12 text-4xl opacity-25 animate-bounce" style={{ animationDelay: '1s', animationDuration: '4s' }}>✨</div>
          <div className="absolute top-24 left-1/4 text-2xl opacity-20 animate-bounce" style={{ animationDelay: '2s', animationDuration: '3.5s' }}>🌟</div>
          <div className="absolute top-28 right-1/3 text-3xl opacity-25 animate-bounce" style={{ animationDelay: '0.5s', animationDuration: '4.5s' }}>🎊</div>
          <div className="absolute top-32 left-1/3 text-2xl opacity-20 animate-bounce" style={{ animationDelay: '1.5s', animationDuration: '3.2s' }}>💫</div>
          <div className="absolute top-40 left-12 text-3xl opacity-20 animate-bounce" style={{ animationDelay: '2.5s', animationDuration: '3.8s' }}>🎈</div>
          <div className="absolute top-44 right-20 text-2xl opacity-25 animate-bounce" style={{ animationDelay: '0.8s', animationDuration: '4.2s' }}>🌈</div>
          <div className="absolute top-48 left-1/2 text-3xl opacity-20 animate-bounce" style={{ animationDelay: '1.8s', animationDuration: '3.6s' }}>🎁</div>
          <div className="absolute top-52 right-1/4 text-2xl opacity-25 animate-bounce" style={{ animationDelay: '2.2s', animationDuration: '4.1s' }}>🎪</div>
          <div className="absolute bottom-32 right-12 text-4xl opacity-20 animate-bounce" style={{ animationDelay: '2.5s', animationDuration: '3.8s' }}>🎈</div>
          <div className="absolute bottom-36 left-24 text-3xl opacity-25 animate-bounce" style={{ animationDelay: '0.8s', animationDuration: '4.2s' }}>🌈</div>
          <div className="absolute bottom-40 right-20 text-3xl opacity-20 animate-bounce" style={{ animationDelay: '1.8s', animationDuration: '3.6s' }}>🎊</div>
          <div className="absolute bottom-44 left-12 text-4xl opacity-25 animate-bounce" style={{ animationDelay: '2.2s', animationDuration: '4.1s' }}>🎁</div>
          <div className="absolute bottom-48 right-1/3 text-2xl opacity-20 animate-bounce" style={{ animationDelay: '0.4s', animationDuration: '3.3s' }}>🎪</div>
          <div className="absolute bottom-52 left-1/3 text-3xl opacity-25 animate-bounce" style={{ animationDelay: '1.9s', animationDuration: '4.5s' }}>🎭</div>
          
          {/* Floating shapes */}
          <div className="absolute top-1/2 left-8 w-5 h-5 bg-green-200 rounded-full opacity-25 animate-pulse" style={{ animationDelay: '2.1s' }}></div>
          <div className="absolute top-1/2 right-8 w-6 h-6 bg-yellow-200 rounded-full opacity-20 animate-pulse" style={{ animationDelay: '0.9s' }}></div>
          <div className="absolute bottom-1/3 left-1/4 w-4 h-4 bg-red-200 rounded-full opacity-30 animate-pulse" style={{ animationDelay: '1.5s' }}></div>
          <div className="absolute bottom-1/3 right-1/4 w-8 h-8 bg-orange-200 rounded-full opacity-25 animate-pulse" style={{ animationDelay: '2.6s' }}></div>
        </div>
        <div className="w-full max-w-md relative z-10">
          <Card className="shadow-lg border-0">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Account Created Successfully!</h2>
                <p className="text-gray-600 mb-4">
                  Welcome to StudyCompanion! You're being redirected to your dashboard...
                </p>
                <div className="flex items-center justify-center">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center overflow-hidden animate-pulse">
                    <img 
                      src="/images/Lightweight-logo.png.jpg" 
                      alt="Lightweight Logo" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Top Row - Celebration Icons */}
        <div className="absolute top-16 left-8 text-3xl opacity-20 animate-bounce" style={{ animationDelay: '0s', animationDuration: '3s' }}>🚀</div>
        <div className="absolute top-20 right-12 text-4xl opacity-25 animate-bounce" style={{ animationDelay: '1s', animationDuration: '4s' }}>✨</div>
        <div className="absolute top-24 left-1/4 text-2xl opacity-20 animate-bounce" style={{ animationDelay: '2s', animationDuration: '3.5s' }}>🎉</div>
        <div className="absolute top-28 right-1/3 text-3xl opacity-25 animate-bounce" style={{ animationDelay: '0.5s', animationDuration: '4.5s' }}>🌟</div>
        <div className="absolute top-32 left-1/3 text-2xl opacity-20 animate-bounce" style={{ animationDelay: '1.5s', animationDuration: '3.2s' }}>💫</div>
        
        {/* Second Row */}
        <div className="absolute top-40 left-12 text-3xl opacity-20 animate-bounce" style={{ animationDelay: '2.5s', animationDuration: '3.8s' }}>🎊</div>
        <div className="absolute top-44 right-20 text-2xl opacity-25 animate-bounce" style={{ animationDelay: '0.8s', animationDuration: '4.2s' }}>🌈</div>
        <div className="absolute top-48 left-1/2 text-3xl opacity-20 animate-bounce" style={{ animationDelay: '1.8s', animationDuration: '3.6s' }}>🎈</div>
        <div className="absolute top-52 right-1/4 text-2xl opacity-25 animate-bounce" style={{ animationDelay: '2.2s', animationDuration: '4.1s' }}>🎁</div>
        
        {/* Third Row */}
        <div className="absolute top-60 left-16 text-2xl opacity-20 animate-bounce" style={{ animationDelay: '0.3s', animationDuration: '3.9s' }}>🎪</div>
        <div className="absolute top-64 right-16 text-3xl opacity-25 animate-bounce" style={{ animationDelay: '1.2s', animationDuration: '4.3s' }}>🎭</div>
        <div className="absolute top-68 left-1/4 text-2xl opacity-20 animate-bounce" style={{ animationDelay: '2.7s', animationDuration: '3.7s' }}>🎨</div>
        <div className="absolute top-72 right-1/3 text-3xl opacity-25 animate-bounce" style={{ animationDelay: '0.9s', animationDuration: '4.4s' }}>🎵</div>
        
        {/* Fourth Row */}
        <div className="absolute top-80 left-20 text-2xl opacity-20 animate-bounce" style={{ animationDelay: '1.6s', animationDuration: '3.4s' }}>🎯</div>
        <div className="absolute top-84 right-24 text-3xl opacity-25 animate-bounce" style={{ animationDelay: '2.1s', animationDuration: '4.6s' }}>🎲</div>
        <div className="absolute top-88 left-1/3 text-2xl opacity-20 animate-bounce" style={{ animationDelay: '0.7s', animationDuration: '3.8s' }}>🎪</div>
        <div className="absolute top-92 right-1/4 text-3xl opacity-25 animate-bounce" style={{ animationDelay: '2.9s', animationDuration: '4.1s' }}>🎊</div>
        
        {/* Fifth Row */}
        <div className="absolute top-96 left-12 text-2xl opacity-20 animate-bounce" style={{ animationDelay: '1.1s', animationDuration: '3.3s' }}>🎉</div>
        <div className="absolute top-100 right-20 text-3xl opacity-25 animate-bounce" style={{ animationDelay: '2.4s', animationDuration: '4.7s' }}>🌟</div>
        <div className="absolute top-104 left-1/2 text-2xl opacity-20 animate-bounce" style={{ animationDelay: '0.6s', animationDuration: '3.9s' }}>✨</div>
        <div className="absolute top-108 right-1/3 text-3xl opacity-25 animate-bounce" style={{ animationDelay: '1.9s', animationDuration: '4.2s' }}>💫</div>
        
        {/* Bottom Row */}
        <div className="absolute bottom-32 right-12 text-4xl opacity-20 animate-bounce" style={{ animationDelay: '2.5s', animationDuration: '3.8s' }}>🎊</div>
        <div className="absolute bottom-36 left-24 text-3xl opacity-25 animate-bounce" style={{ animationDelay: '0.8s', animationDuration: '4.2s' }}>🌈</div>
        <div className="absolute bottom-40 right-20 text-3xl opacity-20 animate-bounce" style={{ animationDelay: '1.8s', animationDuration: '3.6s' }}>🎈</div>
        <div className="absolute bottom-44 left-12 text-4xl opacity-25 animate-bounce" style={{ animationDelay: '2.2s', animationDuration: '4.1s' }}>🎁</div>
        <div className="absolute bottom-48 right-1/3 text-2xl opacity-20 animate-bounce" style={{ animationDelay: '0.4s', animationDuration: '3.3s' }}>🎪</div>
        <div className="absolute bottom-52 left-1/3 text-3xl opacity-25 animate-bounce" style={{ animationDelay: '1.9s', animationDuration: '4.5s' }}>🎭</div>
        
        {/* More Bottom Elements */}
        <div className="absolute bottom-64 right-16 text-2xl opacity-20 animate-bounce" style={{ animationDelay: '2.8s', animationDuration: '3.9s' }}>🎨</div>
        <div className="absolute bottom-68 left-20 text-3xl opacity-25 animate-bounce" style={{ animationDelay: '0.6s', animationDuration: '4.2s' }}>🎵</div>
        <div className="absolute bottom-72 right-1/4 text-2xl opacity-20 animate-bounce" style={{ animationDelay: '1.4s', animationDuration: '3.5s' }}>🎯</div>
        <div className="absolute bottom-76 left-1/4 text-3xl opacity-25 animate-bounce" style={{ animationDelay: '2.3s', animationDuration: '4.3s' }}>🎲</div>
        <div className="absolute bottom-80 right-1/5 text-2xl opacity-20 animate-bounce" style={{ animationDelay: '0.9s', animationDuration: '3.7s' }}>🎪</div>
        <div className="absolute bottom-84 left-1/5 text-3xl opacity-25 animate-bounce" style={{ animationDelay: '1.7s', animationDuration: '4.4s' }}>🎊</div>
        
        {/* Floating geometric shapes - Celebration colors */}
        <div className="absolute top-40 right-8 w-8 h-8 bg-purple-200 rounded-full opacity-30 animate-pulse" style={{ animationDelay: '1.2s' }}></div>
        <div className="absolute top-60 left-8 w-6 h-6 bg-pink-200 rounded-full opacity-25 animate-pulse" style={{ animationDelay: '2.8s' }}></div>
        <div className="absolute top-80 right-12 w-10 h-10 bg-blue-200 rounded-full opacity-20 animate-pulse" style={{ animationDelay: '0.3s' }}></div>
        <div className="absolute bottom-40 right-16 w-10 h-10 bg-blue-200 rounded-full opacity-20 animate-pulse" style={{ animationDelay: '0.3s' }}></div>
        <div className="absolute bottom-60 left-16 w-7 h-7 bg-indigo-200 rounded-full opacity-30 animate-pulse" style={{ animationDelay: '1.7s' }}></div>
        <div className="absolute top-1/2 left-8 w-5 h-5 bg-green-200 rounded-full opacity-25 animate-pulse" style={{ animationDelay: '2.1s' }}></div>
        <div className="absolute top-1/2 right-8 w-6 h-6 bg-yellow-200 rounded-full opacity-20 animate-pulse" style={{ animationDelay: '0.9s' }}></div>
        <div className="absolute bottom-1/3 left-1/4 w-4 h-4 bg-red-200 rounded-full opacity-30 animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute bottom-1/3 right-1/4 w-8 h-8 bg-orange-200 rounded-full opacity-25 animate-pulse" style={{ animationDelay: '2.6s' }}></div>
        <div className="absolute top-1/4 left-1/6 w-3 h-3 bg-purple-300 rounded-full opacity-20 animate-pulse" style={{ animationDelay: '0.7s' }}></div>
        <div className="absolute top-1/3 right-1/6 w-4 h-4 bg-pink-300 rounded-full opacity-25 animate-pulse" style={{ animationDelay: '1.8s' }}></div>
        <div className="absolute bottom-1/4 left-1/5 w-5 h-5 bg-blue-300 rounded-full opacity-20 animate-pulse" style={{ animationDelay: '2.4s' }}></div>
        <div className="absolute bottom-1/3 right-1/5 w-3 h-3 bg-indigo-300 rounded-full opacity-30 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        
        {/* More celebration shapes */}
        <div className="absolute top-1/6 left-1/8 w-2 h-2 bg-yellow-300 rounded-full opacity-25 animate-pulse" style={{ animationDelay: '1.3s' }}></div>
        <div className="absolute top-1/5 right-1/8 w-3 h-3 bg-green-300 rounded-full opacity-20 animate-pulse" style={{ animationDelay: '2.7s' }}></div>
        <div className="absolute bottom-1/6 left-1/7 w-4 h-4 bg-red-300 rounded-full opacity-25 animate-pulse" style={{ animationDelay: '0.8s' }}></div>
        <div className="absolute bottom-1/5 right-1/7 w-2 h-2 bg-orange-300 rounded-full opacity-30 animate-pulse" style={{ animationDelay: '1.6s' }}></div>
        
        {/* Subtle gradient orbs - More celebration colors */}
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-gradient-to-r from-purple-200 to-pink-200 rounded-full opacity-10 blur-xl animate-pulse" style={{ animationDelay: '0s', animationDuration: '6s' }}></div>
        <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-gradient-to-r from-blue-200 to-indigo-200 rounded-full opacity-10 blur-xl animate-pulse" style={{ animationDelay: '3s', animationDuration: '8s' }}></div>
        <div className="absolute top-1/2 right-1/6 w-24 h-24 bg-gradient-to-r from-green-200 to-teal-200 rounded-full opacity-8 blur-xl animate-pulse" style={{ animationDelay: '1.5s', animationDuration: '7s' }}></div>
        <div className="absolute bottom-1/2 left-1/6 w-28 h-28 bg-gradient-to-r from-yellow-200 to-orange-200 rounded-full opacity-8 blur-xl animate-pulse" style={{ animationDelay: '4.5s', animationDuration: '9s' }}></div>
        <div className="absolute top-1/3 left-1/12 w-20 h-20 bg-gradient-to-r from-red-200 to-pink-200 rounded-full opacity-6 blur-xl animate-pulse" style={{ animationDelay: '2.2s', animationDuration: '5.5s' }}></div>
        <div className="absolute bottom-1/3 right-1/12 w-22 h-22 bg-gradient-to-r from-indigo-200 to-purple-200 rounded-full opacity-6 blur-xl animate-pulse" style={{ animationDelay: '3.8s', animationDuration: '6.5s' }}></div>
        
        {/* Floating lines and celebration shapes */}
        <div className="absolute top-1/3 left-1/12 w-1 h-16 bg-gradient-to-b from-purple-300 to-transparent opacity-20 animate-pulse" style={{ animationDelay: '2.2s', animationDuration: '4s' }}></div>
        <div className="absolute bottom-1/3 right-1/12 w-1 h-20 bg-gradient-to-t from-pink-300 to-transparent opacity-20 animate-pulse" style={{ animationDelay: '1.1s', animationDuration: '5s' }}></div>
        <div className="absolute top-2/3 left-1/8 w-16 h-1 bg-gradient-to-r from-blue-300 to-transparent opacity-15 animate-pulse" style={{ animationDelay: '3.2s', animationDuration: '6s' }}></div>
        <div className="absolute bottom-2/3 right-1/8 w-12 h-1 bg-gradient-to-l from-indigo-300 to-transparent opacity-15 animate-pulse" style={{ animationDelay: '0.8s', animationDuration: '4.5s' }}></div>
        <div className="absolute top-1/6 left-1/10 w-1 h-12 bg-gradient-to-b from-yellow-300 to-transparent opacity-18 animate-pulse" style={{ animationDelay: '1.9s', animationDuration: '3.8s' }}></div>
        <div className="absolute bottom-1/6 right-1/10 w-1 h-14 bg-gradient-to-t from-green-300 to-transparent opacity-18 animate-pulse" style={{ animationDelay: '2.6s', animationDuration: '4.2s' }}></div>
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Join StudyCompanion</h1>
          <p className="text-gray-600">Create your account to get started</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-center">Create Account</CardTitle>
            <CardDescription className="text-center">
              Fill in your details to create your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="Username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Full Name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
                    className="h-11"
                  />
                </div>
              </div>

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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
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
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirm Password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
                    className="h-11"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (Optional)</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="Phone Number"
                    value={formData.phone}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location (Optional)</Label>
                  <Input
                    id="location"
                    name="location"
                    type="text"
                    placeholder="City, Country"
                    value={formData.location}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio (Optional)</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  placeholder="Tell us about yourself..."
                  value={formData.bio}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  rows={3}
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <button
                  onClick={() => navigate("/login")}
                  className="text-purple-600 hover:text-purple-700 font-medium"
                  disabled={isLoading}
                >
                  Sign in
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
