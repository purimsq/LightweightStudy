import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, Upload, X, Loader2, ZoomIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileImageUploadProps {
  currentImage?: string;
  currentAvatar?: string;
  userName?: string;
  onImageUpdate?: (imagePath: string | null) => void;
  disabled?: boolean;
}

export default function ProfileImageUpload({ 
  currentImage, 
  currentAvatar, 
  userName, 
  onImageUpdate,
  disabled = false 
}: ProfileImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isViewingImage, setIsViewingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { updateUser } = useAuth();


  const handleImageClick = () => {
    // Always open file picker when clicking on the avatar
    if (!disabled && !isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleUploadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled && !isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPG, PNG, GIF, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('profileImage', file);

      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      const response = await fetch('/api/users/profile-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload error response:', errorText);
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      // Update the user context
      updateUser(result.user);
      
      // Call the callback if provided
      onImageUpdate?.(result.profileImagePath);

      toast({
        title: "Success!",
        description: "Profile image uploaded successfully",
      });
    } catch (error) {
      console.error('Image upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteImage = async () => {
    if (!currentImage) return;

    setIsDeleting(true);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      const response = await fetch('/api/users/profile-image', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Delete error response:', errorText);
        throw new Error(`Delete failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      // Update the user context
      updateUser(result.user);
      
      // Call the callback if provided
      onImageUpdate?.(null);

      toast({
        title: "Success!",
        description: "Profile image deleted successfully",
      });
    } catch (error) {
      console.error('Image deletion error:', error);
      toast({
        title: "Deletion failed",
        description: error instanceof Error ? error.message : "Failed to delete image",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getInitials = (name: string) => {
    console.log('🔤 Getting initials for:', name);
    const initials = name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
    console.log('🔤 Generated initials:', initials);
    return initials;
  };

  console.log('🖼️ ProfileImageUpload props:', { currentImage, userName, currentAvatar });

  return (
    <div className="flex flex-col items-center space-y-2">
      <div className="relative group">
        <Avatar 
          className="w-20 h-20 cursor-pointer hover:opacity-90 transition-opacity"
          onClick={handleImageClick}
        >
          {currentImage ? (
            <AvatarImage 
              src={currentImage} 
              alt={`${userName}'s profile`}
              className="object-cover"
            />
          ) : (
            <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600 text-white text-2xl font-bold">
              {getInitials(userName || 'User')}
            </AvatarFallback>
          )}
        </Avatar>
        
        {/* Camera icon overlay - appears on hover */}
        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={handleUploadClick}>
          {isUploading ? (
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          ) : (
            <Camera className="w-6 h-6 text-white" />
          )}
        </div>

        {/* Delete button for existing images - only show when hovering */}
        {currentImage && !disabled && (
          <button
            onClick={handleDeleteImage}
            disabled={isDeleting}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {isDeleting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <X className="w-3 h-3" />
            )}
          </button>
        )}
      </div>

      {/* View Photo Button - only show when image exists */}
      {currentImage && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsViewingImage(true)}
          className="flex items-center gap-2"
        >
          <ZoomIn className="w-4 h-4" />
          View Photo
        </Button>
      )}


      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Image Viewer Dialog */}
      <Dialog open={isViewingImage} onOpenChange={setIsViewingImage}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-center">
              {userName}'s Profile Picture
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-6 pt-0">
            {currentImage && (
              <img
                src={currentImage}
                alt={`${userName}'s profile`}
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
              />
            )}
          </div>
          <div className="flex justify-center gap-4 p-6 pt-0">
            <Button
              onClick={handleUploadClick}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Camera className="w-4 h-4" />
              Change Photo
            </Button>
            <Button
              onClick={handleDeleteImage}
              variant="destructive"
              className="flex items-center gap-2"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <X className="w-4 h-4" />
              )}
              Remove Photo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
