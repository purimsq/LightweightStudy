import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Loader2, AlertTriangle, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';

interface AccountDeletionDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type DeletionStep = 'password' | 'confirmation' | 'final';

export default function AccountDeletionDialog({ isOpen, onClose }: AccountDeletionDialogProps) {
  const [currentStep, setCurrentStep] = useState<DeletionStep>('password');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { logout } = useAuth();
  const [, navigate] = useLocation();

  const handlePasswordStep = async () => {
    if (!password.trim()) {
      toast({
        title: "Password Required",
        description: "Please enter your password to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const token = localStorage.getItem('authToken');
      console.log('🔑 Account Deletion - Token found:', !!token, 'Length:', token?.length);
      const response = await fetch('/api/auth/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        setCurrentStep('confirmation');
        toast({
          title: "Password Verified",
          description: "Please proceed to the next step.",
        });
      } else {
        toast({
          title: "Invalid Password",
          description: "The password you entered is incorrect. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Password verification error:', error);
      toast({
        title: "Verification Error",
        description: "An error occurred while verifying your password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmationStep = () => {
    if (confirmation !== 'Delete') {
      toast({
        title: "Invalid Confirmation",
        description: "Please type exactly 'Delete' (case-sensitive) to continue.",
        variant: "destructive",
      });
      return;
    }

    setCurrentStep('final');
    toast({
      title: "Final Step",
      description: "Please review the warnings before confirming deletion.",
    });
  };

  const handleFinalDeletion = async () => {
    setIsLoading(true);
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/auth/account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ password, confirmation }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Account Deleted",
          description: "Your account has been permanently deleted. You will now be logged out.",
        });
        
        // Logout and redirect to login
        logout();
        navigate('/login');
      } else {
        toast({
          title: "Deletion Failed",
          description: data.message || "Failed to delete your account. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Account deletion error:', error);
      toast({
        title: "Deletion Error",
        description: "An error occurred while deleting your account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setCurrentStep('password');
      setPassword('');
      setShowPassword(false);
      setConfirmation('');
      onClose();
    }
  };

  const handleBack = () => {
    if (currentStep === 'confirmation') {
      setCurrentStep('password');
      setConfirmation('');
    } else if (currentStep === 'final') {
      setCurrentStep('confirmation');
    }
  };

  const renderPasswordStep = () => (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-900 mb-1">Step 1: Password Verification</h3>
            <p className="text-sm text-red-700">
              Enter your current password to verify your identity and proceed with account deletion.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="delete-password">Enter your password</Label>
        <div className="relative">
          <Input
            id="delete-password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your current password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            onKeyPress={(e) => e.key === 'Enter' && handlePasswordStep()}
            className="pr-10"
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

      <div className="flex justify-end gap-3 pt-4">
        <Button
          variant="outline"
          onClick={handleClose}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          onClick={handlePasswordStep}
          disabled={isLoading || !password.trim()}
          className="bg-red-600 hover:bg-red-700"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            'Continue'
          )}
        </Button>
      </div>
    </div>
  );

  const renderConfirmationStep = () => (
    <div className="space-y-4">
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <XCircle className="w-5 h-5 text-orange-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-orange-900 mb-1">Step 2: Type Confirmation</h3>
            <p className="text-sm text-orange-700">
              Type exactly <strong>"Delete"</strong> (case-sensitive) to confirm you understand this action is irreversible.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="delete-confirmation">Type "Delete" to continue</Label>
        <Input
          id="delete-confirmation"
          type="text"
          placeholder="Type: Delete"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          disabled={isLoading}
          onKeyPress={(e) => e.key === 'Enter' && confirmation === 'Delete' && handleConfirmationStep()}
          className={`${confirmation === 'Delete' ? 'border-green-500 bg-green-50' : confirmation.length > 0 ? 'border-red-500 bg-red-50' : ''}`}
        />
        {confirmation.length > 0 && (
          <div className={`text-sm ${confirmation === 'Delete' ? 'text-green-600' : 'text-red-600'}`}>
            {confirmation === 'Delete' ? (
              <div className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                Correct! You can now continue.
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <XCircle className="w-4 h-4" />
                Please type exactly "Delete" (case-sensitive)
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={isLoading}
        >
          Back
        </Button>
        <Button
          onClick={handleConfirmationStep}
          disabled={isLoading || confirmation !== 'Delete'}
          className={`${confirmation === 'Delete' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-gray-400 cursor-not-allowed'}`}
        >
          Continue
        </Button>
      </div>
    </div>
  );

  const renderFinalStep = () => (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-900 mb-1">Step 3: Final Confirmation</h3>
            <p className="text-sm text-red-700">
              This is your last chance to cancel. Once confirmed, your account and all data will be permanently deleted.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-red-100 border border-red-300 rounded-lg p-4">
        <h4 className="font-semibold text-red-900 mb-2">⚠️ What will be deleted:</h4>
        <ul className="text-sm text-red-800 space-y-1">
          <li>• Your profile and account information</li>
          <li>• All your study documents and units</li>
          <li>• Your learning progress and statistics</li>
          <li>• All friends and connections</li>
          <li>• Your notifications and messages</li>
          <li>• All uploaded files and data</li>
        </ul>
      </div>

      <div className="bg-red-200 border border-red-400 rounded-lg p-4">
        <h4 className="font-semibold text-red-900 mb-2">🚨 Important Warnings:</h4>
        <ul className="text-sm text-red-900 space-y-1">
          <li>• This action is <strong>PERMANENT</strong> and cannot be undone</li>
          <li>• All your data will be <strong>completely removed</strong> from our servers</li>
          <li>• You will lose access to all your study materials</li>
          <li>• Your friends will no longer be able to find you</li>
          <li>• You cannot recover any of this data later</li>
        </ul>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={isLoading}
        >
          Back
        </Button>
        <Button
          onClick={handleFinalDeletion}
          disabled={isLoading}
          className="bg-red-600 hover:bg-red-700"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Deleting Account...
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4 mr-2" />
              Confirm Delete Account
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-500" />
            Delete Account
          </DialogTitle>
        </DialogHeader>
        
        {currentStep === 'password' && renderPasswordStep()}
        {currentStep === 'confirmation' && renderConfirmationStep()}
        {currentStep === 'final' && renderFinalStep()}
      </DialogContent>
    </Dialog>
  );
}
