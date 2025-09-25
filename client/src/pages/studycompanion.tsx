import { Book, Brain, Target, Users, Zap, Shield, Heart, Star, ArrowRight, CheckCircle, User, Mail, Phone, Calendar, MapPin, Edit3, Camera, Settings, Bell, Lock, Palette, Globe, Download, Upload, Trash2, Save, X, Eye, EyeOff, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import ProfileImageUpload from "@/components/profile-image-upload";
import PasswordAuthDialog from "@/components/password-auth-dialog";
import { PasswordStrengthIndicator, defaultPasswordRequirements } from "@/components/ui/password-strength-indicator";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSidebar } from "@/contexts/SidebarContext";
import { useTheme } from "@/contexts/ThemeContext";
import DataExportDialog from "@/components/data-export-dialog";
import AccountDeletionDialog from "@/components/account-deletion-dialog";
import FontSettings from "@/components/font-settings";

export default function StudyCompanion() {
  const { user, updateUser, logout } = useAuth();
  const { toast } = useToast();
  const { defaultCollapsed, setDefaultCollapsed } = useSidebar();
  const { theme, setTheme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPasswordAuth, setShowPasswordAuth] = useState(false);
  const [showDataExport, setShowDataExport] = useState(false);
  const [showAccountDeletion, setShowAccountDeletion] = useState(false);
  
  // Password change states
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordChangeData, setPasswordChangeData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [showPasswordFields, setShowPasswordFields] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordRequirementsMet, setPasswordRequirementsMet] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPasswordVerified, setCurrentPasswordVerified] = useState(false);
  const [isVerifyingCurrentPassword, setIsVerifyingCurrentPassword] = useState(false);

  // Use real user data from auth context
  const [userData, setUserData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    bio: user?.bio || "",
    location: user?.location || "",
    joinDate: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : "",
    avatar: user?.avatar || "U",
    profileImagePath: user?.profileImagePath || null,
    studyMode: true,
    notifications: {
      email: true,
      push: true,
      studyReminders: true,
      assignmentDeadlines: true,
      weeklyReports: false
    },
    privacy: {
      profileVisibility: "public",
      showStudyProgress: true,
      allowMessages: true
    },
    appearance: {
      fontSize: "medium"
    }
  });

  // Update userData when user changes
  React.useEffect(() => {
    if (user) {
      setUserData(prev => ({
        ...prev,
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        bio: user.bio || "",
        location: user.location || "",
        joinDate: user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : "",
        avatar: user.avatar || "U",
        profileImagePath: user.profileImagePath || null,
      }));
    }
  }, [user]);

  const handleImageUpdate = (imagePath: string | null) => {
    setUserData(prev => ({
      ...prev,
      profileImagePath: imagePath
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    
    setIsUpdating(true);
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          name: userData.name,
          phone: userData.phone,
          bio: userData.bio,
          location: userData.location,
        }),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        updateUser(updatedUser.user);
        setIsEditing(false);
        toast({
          title: "Profile Updated",
          description: "Your profile has been updated successfully.",
        });
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset to original user data
    if (user) {
      setUserData(prev => ({
        ...prev,
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        bio: user.bio || "",
        location: user.location || "",
        avatar: user.avatar || "U",
      }));
    }
  };

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
  };

  const handleEditProfile = () => {
    setShowPasswordAuth(true);
  };

  const handlePasswordAuthSuccess = () => {
    setIsEditing(true);
    toast({
      title: "Authentication Successful",
      description: "You can now edit your profile information.",
    });
  };

  const handlePasswordAuthClose = () => {
    setShowPasswordAuth(false);
  };

  // Password change functions
  const handleChangePassword = () => {
    setShowPasswordChange(true);
    // Reset password fields
    setPasswordChangeData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    });
    setPasswordRequirementsMet(false);
    setCurrentPasswordVerified(false);
  };

  const handlePasswordChangeClose = () => {
    setShowPasswordChange(false);
    setPasswordChangeData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    });
    setPasswordRequirementsMet(false);
    setCurrentPasswordVerified(false);
  };

  const handleVerifyCurrentPassword = async () => {
    if (!passwordChangeData.currentPassword.trim()) {
      toast({
        title: "Password Required",
        description: "Please enter your current password to verify.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifyingCurrentPassword(true);
    try {
      // Add a small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await fetch('/api/auth/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ password: passwordChangeData.currentPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setCurrentPasswordVerified(true);
        toast({
          title: "Password Verified",
          description: "You can now enter your new password.",
        });
      } else {
        console.error('Password verification failed:', data);
        toast({
          title: "Verification Failed",
          description: data.message || "Invalid password. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Password verification error:', error);
      toast({
        title: "Verification Error",
        description: error.message === 'No authentication token found' 
          ? "Please log in again to verify your password." 
          : "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifyingCurrentPassword(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!user || !currentPasswordVerified) return;

    // Validate passwords
    if (passwordChangeData.newPassword !== passwordChangeData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirm password do not match.",
        variant: "destructive",
      });
      return;
    }

    if (passwordChangeData.currentPassword === passwordChangeData.newPassword) {
      toast({
        title: "Same Password",
        description: "New password must be different from your current password.",
        variant: "destructive",
      });
      return;
    }

    if (!passwordRequirementsMet) {
      toast({
        title: "Password Requirements Not Met",
        description: "Please ensure your password meets all requirements.",
        variant: "destructive",
      });
      return;
    }

    // Debug: Log what we're sending
    // Store password values before they might get cleared
    const currentPassword = passwordChangeData.currentPassword;
    const newPassword = passwordChangeData.newPassword;
    
    setIsChangingPassword(true);
    try {
      // Add a delay for better UX - show loading state for 2.5 seconds
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: currentPassword,
          newPassword: newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Password Changed",
          description: "Your password has been updated successfully.",
        });
      } else {
        console.error('Password change failed:', data);
        toast({
          title: "Password Change Failed",
          description: data.message || "Failed to change password. Please try again.",
          variant: "destructive",
        });
      }
      
        // Reset loading state after the full 2.5 second delay
        setIsChangingPassword(false);
        
        // Don't automatically close the dialog - let user close it manually
        // The success message will show and user can close when ready
    } catch (error: any) {
      console.error('Password change error:', error);
      toast({
        title: "Password Change Error",
        description: error.message === 'No authentication token found' 
          ? "Please log in again to change your password." 
          : "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      // Reset loading state on error too
      setIsChangingPassword(false);
    }
  };

  // Check password requirements
  useEffect(() => {
    // Don't update password requirements during loading state
    if (isChangingPassword) {
      return;
    }
    
    const allRequirementsMet = defaultPasswordRequirements.every(req => req.test(passwordChangeData.newPassword));
    setPasswordRequirementsMet(allRequirementsMet);
  }, [passwordChangeData.newPassword, isChangingPassword]);

  // Helper function to determine if password change button should be enabled
  const isPasswordChangeButtonEnabled = () => {
    const checks = {
      currentPasswordVerified,
      isChangingPassword,
      passwordRequirementsMet,
      passwordsMatch: passwordChangeData.newPassword === passwordChangeData.confirmPassword,
      newPasswordExists: !!passwordChangeData.newPassword,
      confirmPasswordExists: !!passwordChangeData.confirmPassword,
      minLength: passwordChangeData.newPassword.length >= 8,
      differentPassword: passwordChangeData.currentPassword !== passwordChangeData.newPassword
    };
    
    // If we're changing password, the button should be enabled to show loading state
    if (checks.isChangingPassword) return true;
    
    // Otherwise, check all requirements
    if (!checks.currentPasswordVerified) return false;
    if (!checks.passwordRequirementsMet) return false;
    if (!checks.passwordsMatch) return false;
    if (!checks.newPasswordExists) return false;
    if (!checks.confirmPasswordExists) return false;
    if (!checks.minLength) return false;
    if (!checks.differentPassword) return false;
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream via-white to-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile & Settings</h1>
          <p className="text-gray-600">Manage your account, preferences, and privacy settings</p>
        </div>


        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 bg-gray-100 p-1 rounded-lg w-fit">
          {[
            { id: "profile", label: "Profile", icon: User },
            { id: "notifications", label: "Notifications", icon: Bell },
            { id: "privacy", label: "Privacy", icon: Lock },
            { id: "appearance", label: "Appearance", icon: Palette },
            { id: "account", label: "Account", icon: Settings }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-white text-purple-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="space-y-6">
            {/* Profile Header */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-start space-x-6">
                    <ProfileImageUpload
                      currentImage={userData.profileImagePath}
                      currentAvatar={userData.avatar}
                      userName={userData.name}
                      onImageUpdate={handleImageUpdate}
                      disabled={false}
                    />
                    <div className="pt-2">
                      <h2 className="text-2xl font-bold text-gray-900">{userData.name}</h2>
                      <p className="text-gray-600">{userData.email}</p>
                      <p className="text-sm text-gray-500">Member since {userData.joinDate}</p>
                    </div>
                  </div>
                  <Button
                    onClick={isEditing ? () => setIsEditing(false) : handleEditProfile}
                    variant={isEditing ? "outline" : "default"}
                    className="flex items-center space-x-2"
                  >
                    {isEditing ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                    <span>{isEditing ? "Cancel" : "Edit Profile"}</span>
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {/* Profile Information */}
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your personal details and contact information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={userData.name}
                      onChange={(e) => setUserData({...userData, name: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={userData.email}
                      onChange={(e) => setUserData({...userData, email: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={userData.phone}
                      onChange={(e) => setUserData({...userData, phone: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={userData.location}
                      onChange={(e) => setUserData({...userData, location: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={userData.bio}
                    onChange={(e) => setUserData({...userData, bio: e.target.value})}
                    disabled={!isEditing}
                    rows={3}
                  />
                </div>
                    {isEditing && (
                      <div className="flex space-x-2 pt-4">
                        <Button 
                          onClick={handleSave} 
                          disabled={isUpdating}
                          className="flex items-center space-x-2"
                        >
                          <Save className="w-4 h-4" />
                          <span>{isUpdating ? "Saving..." : "Save Changes"}</span>
                        </Button>
                        <Button onClick={handleCancel} variant="outline" disabled={isUpdating}>
                          Cancel
                        </Button>
                      </div>
                    )}
              </CardContent>
            </Card>

            {/* Study Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Study Statistics</CardTitle>
                <CardDescription>Your learning progress and achievements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <Book className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">127</div>
                    <div className="text-sm text-gray-600">Documents Studied</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Target className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">45</div>
                    <div className="text-sm text-gray-600">Assignments Completed</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <Star className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">98%</div>
                    <div className="text-sm text-gray-600">Success Rate</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <Zap className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">342h</div>
                    <div className="text-sm text-gray-600">Study Time</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose how you want to be notified about updates and activities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-gray-600">Receive notifications via email</p>
                  </div>
                  <Switch
                    checked={userData.notifications.email}
                    onCheckedChange={(checked) => setUserData({
                      ...userData,
                      notifications: {...userData.notifications, email: checked}
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-gray-600">Receive push notifications in the app</p>
                  </div>
                  <Switch
                    checked={userData.notifications.push}
                    onCheckedChange={(checked) => setUserData({
                      ...userData,
                      notifications: {...userData.notifications, push: checked}
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Study Reminders</Label>
                    <p className="text-sm text-gray-600">Get reminded about scheduled study sessions</p>
                  </div>
                  <Switch
                    checked={userData.notifications.studyReminders}
                    onCheckedChange={(checked) => setUserData({
                      ...userData,
                      notifications: {...userData.notifications, studyReminders: checked}
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Assignment Deadlines</Label>
                    <p className="text-sm text-gray-600">Notifications about upcoming assignment deadlines</p>
                  </div>
                  <Switch
                    checked={userData.notifications.assignmentDeadlines}
                    onCheckedChange={(checked) => setUserData({
                      ...userData,
                      notifications: {...userData.notifications, assignmentDeadlines: checked}
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Weekly Reports</Label>
                    <p className="text-sm text-gray-600">Receive weekly progress reports</p>
                  </div>
                  <Switch
                    checked={userData.notifications.weeklyReports}
                    onCheckedChange={(checked) => setUserData({
                      ...userData,
                      notifications: {...userData.notifications, weeklyReports: checked}
                    })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Privacy Tab */}
        {activeTab === "privacy" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
                <CardDescription>Control who can see your information and activity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label>Profile Visibility</Label>
                    <Select
                      value={userData.privacy.profileVisibility}
                      onValueChange={(value) => setUserData({
                        ...userData,
                        privacy: {...userData.privacy, profileVisibility: value}
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="friends">Friends Only</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Show Study Progress</Label>
                      <p className="text-sm text-gray-600">Allow others to see your study progress</p>
                    </div>
                    <Switch
                      checked={userData.privacy.showStudyProgress}
                      onCheckedChange={(checked) => setUserData({
                        ...userData,
                        privacy: {...userData.privacy, showStudyProgress: checked}
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Allow Messages</Label>
                      <p className="text-sm text-gray-600">Let other users send you messages</p>
                    </div>
                    <Switch
                      checked={userData.privacy.allowMessages}
                      onCheckedChange={(checked) => setUserData({
                        ...userData,
                        privacy: {...userData.privacy, allowMessages: checked}
                      })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data & Security</CardTitle>
                <CardDescription>Manage your data and security preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Change Password</Label>
                    <p className="text-sm text-gray-600">Update your account password for better security</p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="flex items-center space-x-2"
                    onClick={handleChangePassword}
                  >
                    <Lock className="w-4 h-4" />
                    <span>Change Password</span>
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Export My Data</Label>
                    <p className="text-sm text-gray-600">Request a complete backup of your data via email</p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="flex items-center space-x-2"
                    onClick={() => setShowDataExport(true)}
                  >
                    <Download className="w-4 h-4" />
                    <span>Export Data</span>
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Delete Account</Label>
                    <p className="text-sm text-gray-600">Permanently delete your account and all data</p>
                  </div>
                  <Button 
                    variant="destructive" 
                    className="flex items-center space-x-2"
                    onClick={() => setShowAccountDeletion(true)}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Account</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Appearance Tab */}
        {activeTab === "appearance" && (
          <div className="space-y-6">
            {/* Font Settings */}
            <FontSettings />
            
            {/* Other Appearance Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Interface Settings</CardTitle>
                <CardDescription>Customize other interface preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label>Theme</Label>
                    <Select
                      value={theme}
                      onValueChange={setTheme}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="glassmorphism">Glassmorphism</SelectItem>
                        <SelectItem value="auto">Auto (System)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Collapse Sidebar by Default</Label>
                      <p className="text-sm text-muted-foreground">Start with the sidebar collapsed</p>
                    </div>
                    <Switch
                      checked={defaultCollapsed}
                      onCheckedChange={setDefaultCollapsed}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Account Tab */}
        {activeTab === "account" && (
          <div className="space-y-6">
            
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your password to keep your account secure</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="current-password">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Enter new password"
                  />
                </div>
                <div>
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm new password"
                  />
                </div>
                <Button className="flex items-center space-x-2">
                  <Lock className="w-4 h-4" />
                  <span>Update Password</span>
                </Button>
              </CardContent>
            </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Account Information</CardTitle>
                    <CardDescription>View and manage your account details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Account ID</Label>
                        <Input value={`USR-${user?.id || '000000000'}`} disabled />
                      </div>
                      <div>
                        <Label>Member Since</Label>
                        <Input value={userData.joinDate} disabled />
                      </div>
                      <div>
                        <Label>Last Login</Label>
                        <Input value={user?.lastLoginDate ? new Date(user.lastLoginDate).toLocaleString() : "Never"} disabled />
                      </div>
                      <div>
                        <Label>Account Status</Label>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${user?.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <span className="text-sm text-gray-600">{user?.isActive ? 'Active' : 'Inactive'}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Logout Section */}
                <Card>
                  <CardHeader>
                    <CardTitle>Sign Out</CardTitle>
                    <CardDescription>Sign out of your account on this device</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="flex items-center space-x-2">
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure you want to sign out?</AlertDialogTitle>
                          <AlertDialogDescription>
                            You will need to sign in again to access your account. Any unsaved changes will be lost.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleLogout} className="bg-red-600 hover:bg-red-700">
                            Sign Out
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardContent>
                </Card>
          </div>
        )}
      </div>

        {/* Password Authentication Dialog */}
        <PasswordAuthDialog
          isOpen={showPasswordAuth}
          onClose={handlePasswordAuthClose}
          onSuccess={handlePasswordAuthSuccess}
          title="Confirm Password to Edit Profile"
          description="Please enter your current password to edit your profile information"
        />

        {/* Data Export Dialog */}
        <DataExportDialog
          isOpen={showDataExport}
          onClose={() => setShowDataExport(false)}
          onSuccess={() => {
            toast({
              title: "Data Export Requested",
              description: "Your data export has been sent to your email address.",
            });
          }}
        />

        {/* Account Deletion Dialog */}
        <AccountDeletionDialog
          isOpen={showAccountDeletion}
          onClose={() => setShowAccountDeletion(false)}
        />

        {/* Password Change Dialog */}
        <AlertDialog open={showPasswordChange} onOpenChange={(open) => {
          // Prevent closing during password change process
          if (!open && (isChangingPassword || isVerifyingCurrentPassword)) {
            return;
          }
          setShowPasswordChange(open);
        }}>
          <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle>Change Password</AlertDialogTitle>
                  <AlertDialogDescription>
                    {isChangingPassword 
                      ? "Updating your password securely. Please wait..."
                      : currentPasswordVerified && passwordRequirementsMet
                        ? "Password changed successfully! You can now close this dialog."
                        : currentPasswordVerified 
                          ? "Enter your new password. It must meet all security requirements."
                          : "First, verify your current password to proceed with changing it."
                    }
                  </AlertDialogDescription>
                </AlertDialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Current Password */}
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showPasswordFields.current ? "text" : "password"}
                    placeholder="Enter your current password"
                    value={passwordChangeData.currentPassword}
                    onChange={(e) => setPasswordChangeData({
                      ...passwordChangeData,
                      currentPassword: e.target.value
                    })}
                    disabled={isChangingPassword || currentPasswordVerified}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordFields({
                      ...showPasswordFields,
                      current: !showPasswordFields.current
                    })}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    disabled={isChangingPassword || currentPasswordVerified}
                  >
                    {showPasswordFields.current ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {!currentPasswordVerified && (
                  <Button
                    onClick={handleVerifyCurrentPassword}
                    disabled={!passwordChangeData.currentPassword.trim() || isVerifyingCurrentPassword}
                    size="sm"
                    className="w-full"
                  >
                    {isVerifyingCurrentPassword ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Verifying...
                      </>
                    ) : (
                      "Verify Password"
                    )}
                  </Button>
                )}
                {currentPasswordVerified && (
                  <div className="flex items-center text-green-600 text-sm">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Password verified successfully
                  </div>
                )}
              </div>

              {/* New Password Fields - Only show after verification */}
              {currentPasswordVerified && (
                <>
                  {/* New Password */}
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showPasswordFields.new ? "text" : "password"}
                        placeholder="Enter your new password"
                        value={passwordChangeData.newPassword}
                        onChange={(e) => setPasswordChangeData({
                          ...passwordChangeData,
                          newPassword: e.target.value
                        })}
                        disabled={isChangingPassword}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordFields({
                          ...showPasswordFields,
                          new: !showPasswordFields.new
                        })}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        disabled={isChangingPassword}
                      >
                        {showPasswordFields.new ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {passwordChangeData.newPassword && (
                      <PasswordStrengthIndicator
                        password={passwordChangeData.newPassword}
                        requirements={defaultPasswordRequirements}
                      />
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showPasswordFields.confirm ? "text" : "password"}
                        placeholder="Confirm your new password"
                        value={passwordChangeData.confirmPassword}
                        onChange={(e) => setPasswordChangeData({
                          ...passwordChangeData,
                          confirmPassword: e.target.value
                        })}
                        disabled={isChangingPassword}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordFields({
                          ...showPasswordFields,
                          confirm: !showPasswordFields.confirm
                        })}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        disabled={isChangingPassword}
                      >
                        {showPasswordFields.confirm ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {passwordChangeData.confirmPassword && passwordChangeData.newPassword !== passwordChangeData.confirmPassword && (
                      <p className="text-sm text-red-600">Passwords do not match</p>
                    )}
                  </div>
                </>
              )}
            </div>

            <AlertDialogFooter>
              {currentPasswordVerified && passwordRequirementsMet ? (
                // Show Close button when password change is successful
                <AlertDialogAction 
                  onClick={handlePasswordChangeClose}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Close
                </AlertDialogAction>
              ) : (
                <>
                  <AlertDialogCancel onClick={handlePasswordChangeClose} disabled={isChangingPassword || isVerifyingCurrentPassword}>
                    Cancel
                  </AlertDialogCancel>
                  {currentPasswordVerified && (
                    <AlertDialogAction 
                      onClick={isChangingPassword ? undefined : handlePasswordUpdate} 
                      disabled={!isPasswordChangeButtonEnabled()}
                      className={`${isChangingPassword 
                        ? 'bg-blue-500 cursor-wait' 
                        : isPasswordChangeButtonEnabled() 
                          ? 'bg-blue-600 hover:bg-blue-700' 
                          : 'bg-gray-400 cursor-not-allowed hover:bg-gray-400'
                      }`}
                    >
                      {isChangingPassword ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Updating Password...
                        </>
                      ) : (
                        "Change Password"
                      )}
                    </AlertDialogAction>
                  )}
                  {currentPasswordVerified && !isPasswordChangeButtonEnabled() && (
                    <div className="text-center text-sm text-gray-600 mt-2">
                      {!passwordRequirementsMet && "Complete all password requirements above"}
                      {passwordRequirementsMet && passwordChangeData.newPassword !== passwordChangeData.confirmPassword && "Passwords do not match"}
                      {passwordRequirementsMet && passwordChangeData.newPassword === passwordChangeData.confirmPassword && passwordChangeData.currentPassword === passwordChangeData.newPassword && "New password must be different from current password"}
                    </div>
                  )}
                </>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }
