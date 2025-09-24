import { useState, useEffect, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowLeft, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OTPData {
  email: string;
  name: string;
  password: string;
}

export default function VerifyOTP() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/verify-otp/:email");
  const { toast } = useToast();
  
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [otpData, setOtpData] = useState<OTPData | null>(null);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Get OTP data from localStorage
  useEffect(() => {
    const storedData = localStorage.getItem('otpData');
    if (storedData) {
      try {
        const data = JSON.parse(storedData);
        setOtpData(data);
      } catch (error) {
        console.error('Error parsing OTP data:', error);
        navigate('/signup');
      }
    } else {
      navigate('/signup');
    }
  }, [navigate]);

  // Start resend timer
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Start initial timer
  useEffect(() => {
    setResendTimer(60); // 60 seconds before resend is available
  }, []);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return; // Prevent multiple characters
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    
    setOtp(newOtp);
    
    // Focus the next empty input or the last input
    const nextEmptyIndex = newOtp.findIndex(digit => !digit);
    const focusIndex = nextEmptyIndex === -1 ? 5 : nextEmptyIndex;
    inputRefs.current[focusIndex]?.focus();
  };

  const verifyOTP = async () => {
    const otpString = otp.join('');
    
    if (otpString.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    if (!otpData) {
      setError("Session expired. Please try signing up again.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: otpData.email,
          otp: otpString,
          name: otpData.name,
          password: otpData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'OTP verification failed');
      }

      // Clear OTP data from localStorage
      localStorage.removeItem('otpData');
      
      // Store auth token
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      toast({
        title: "Account Created Successfully!",
        description: "Welcome to StudyCompanion! Check your email for more details.",
        duration: 5000,
      });

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error: any) {
      setError(error.message);
      // Clear OTP inputs on error
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const resendOTP = async () => {
    if (!otpData || resendTimer > 0) return;

    setIsResending(true);
    setError("");

    try {
      const response = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: otpData.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to resend OTP');
      }

      toast({
        title: "OTP Resent",
        description: "A new verification code has been sent to your email.",
      });

      setResendTimer(60); // Reset timer
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsResending(false);
    }
  };

  const goBack = () => {
    localStorage.removeItem('otpData');
    navigate('/signup');
  };

  if (!otpData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-gray-600">Loading verification...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={goBack}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              📚 StudyCompanion
            </div>
            <div className="w-16" /> {/* Spacer */}
          </div>
          <CardTitle className="text-2xl">Verify Your Email</CardTitle>
          <CardDescription>
            Enter the 6-digit code sent to<br />
            <span className="font-medium text-purple-600">{otpData.email}</span>
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="flex justify-center space-x-2">
              {otp.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className="w-12 h-12 text-center text-xl font-bold border-2 focus:border-purple-500 focus:ring-purple-500"
                  disabled={isLoading}
                />
              ))}
            </div>
            
            <div className="text-center text-sm text-gray-600">
              Didn't receive the code? Check your spam folder
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={verifyOTP}
              className="w-full h-11 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              disabled={isLoading || otp.join('').length !== 6}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify & Create Account"
              )}
            </Button>

            <Button
              onClick={resendOTP}
              variant="outline"
              className="w-full h-11"
              disabled={isResending || resendTimer > 0}
            >
              {isResending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Resending...
                </>
              ) : resendTimer > 0 ? (
                `Resend in ${resendTimer}s`
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Resend Code
                </>
              )}
            </Button>
          </div>

          <div className="text-center text-xs text-gray-500">
            <p>By verifying your email, you agree to our Terms of Service and Privacy Policy.</p>
            <p className="mt-1">Code expires in 10 minutes</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
