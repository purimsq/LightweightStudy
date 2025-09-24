import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Loader2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DataExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function DataExportDialog({ isOpen, onClose, onSuccess }: DataExportDialogProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    if (!password.trim()) {
      toast({
        title: "Password Required",
        description: "Please enter your password to export your data.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const token = localStorage.getItem('authToken');
      console.log('🔑 Data Export - Token found:', !!token, 'Length:', token?.length);
      const response = await fetch('/api/auth/export-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Data Export Sent",
          description: `Your data export has been sent to ${data.email}. Please check your email.`,
        });
        setPassword('');
        onClose();
        onSuccess?.();
      } else {
        toast({
          title: "Export Failed",
          description: data.message || "Failed to export your data. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Data export error:', error);
      toast({
        title: "Export Error",
        description: "An error occurred while exporting your data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setPassword('');
      setShowPassword(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-500" />
            Export Your Data
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Download className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900 mb-1">Data Export</h3>
                <p className="text-sm text-blue-700">
                  A complete backup of your account data will be sent to your registered email address.
                  This includes your profile, documents, progress, and all other account information.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="export-password">Enter your password to confirm</Label>
            <div className="relative">
              <Input
                id="export-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your current password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                onKeyPress={(e) => e.key === 'Enter' && handleExport()}
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

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-yellow-900 mb-1">Security Notice</h3>
                <p className="text-sm text-yellow-700">
                  Your data export will be sent to your registered email address. 
                  Please ensure you have access to this email account.
                </p>
              </div>
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
              onClick={handleExport}
              disabled={isLoading || !password.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
