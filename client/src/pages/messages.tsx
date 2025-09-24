import { useState, useEffect } from "react";
import { 
  MessageCircle, 
  Search, 
  Send, 
  Phone, 
  Video, 
  MoreVertical, 
  Users, 
  UserPlus,
  Settings,
  Archive,
  Star,
  Filter,
  Paperclip,
  Smile,
  Mic,
  ChevronDown,
  Clock,
  Check,
  CheckCheck,
  Bell,
  Loader2,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/contexts/SidebarContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

// Mock data for the new design
const mockConversations = [
  {
    id: 1,
    name: "Alex Johnson",
    username: "alexj",
    avatar: null,
    lastMessage: "Hey, how's the project going?",
    timestamp: "2:30 PM",
    unreadCount: 2,
    isOnline: true,
    isPinned: true,
    isArchived: false,
    lastSeen: "Online"
  },
  {
    id: 2,
    name: "Study Group",
    username: "study_group",
    avatar: null,
    lastMessage: "Sarah: Meeting moved to 3 PM",
    timestamp: "1:45 PM",
    unreadCount: 5,
    isOnline: false,
    isPinned: false,
    isArchived: false,
    lastSeen: "3 members online"
  },
  {
    id: 3,
    name: "Emma Wilson",
    username: "emmaw",
    avatar: null,
    lastMessage: "Thanks for the notes!",
    timestamp: "12:20 PM",
    unreadCount: 0,
    isOnline: true,
    isPinned: false,
    isArchived: false,
    lastSeen: "Online"
  },
  {
    id: 4,
    name: "Professor Smith",
    username: "prof_smith",
    avatar: null,
    lastMessage: "Please submit your assignment by Friday",
    timestamp: "Yesterday",
    unreadCount: 1,
    isOnline: false,
    isPinned: true,
    isArchived: false,
    lastSeen: "Last seen 2 hours ago"
  },
  {
    id: 5,
    name: "Mike Chen",
    username: "mikec",
    avatar: null,
    lastMessage: "See you at the library",
    timestamp: "Yesterday",
    unreadCount: 0,
    isOnline: false,
    isPinned: false,
    isArchived: true,
    lastSeen: "Last seen yesterday"
  }
];

const mockMessages = [
  {
    id: 1,
    senderId: 1,
    content: "Hey, how's the project going?",
    timestamp: "2:30 PM",
    isRead: false,
    isDelivered: true
  },
  {
    id: 2,
    senderId: 0, // Current user
    content: "Going well! Just finishing up the final touches.",
    timestamp: "2:32 PM",
    isRead: true,
    isDelivered: true
  },
  {
    id: 3,
    senderId: 1,
    content: "That's great! When do you think you'll be done?",
    timestamp: "2:33 PM",
    isRead: false,
    isDelivered: true
  },
  {
    id: 4,
    senderId: 0,
    content: "Probably by tomorrow evening. Want to review it together?",
    timestamp: "2:35 PM",
    isRead: true,
    isDelivered: true
  },
  {
    id: 5,
    senderId: 1,
    content: "Absolutely! Let's schedule a call for tomorrow.",
    timestamp: "2:36 PM",
    isRead: false,
    isDelivered: true
  }
];

// Types
interface User {
  id: number;
  name: string;
  email: string;
  username?: string;
  avatar?: string;
  bio?: string;
  location?: string;
  isActive: boolean;
  lastLoginDate?: string;
  createdAt: string;
}

interface FriendRequest {
  id: number;
  userId: number;
  friendId: number;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  updatedAt: string;
  user?: User;
}

export default function MessagesPage() {
  const { isCollapsed } = useSidebar();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [selectedConversation, setSelectedConversation] = useState(mockConversations[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  
  // New Chat Modal State
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [searchUsers, setSearchUsers] = useState<User[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [friendRequestStatus, setFriendRequestStatus] = useState<Record<number, 'none' | 'sent' | 'received' | 'accepted'>>({});
  
  // Friend Requests Modal State
  const [isFriendRequestsOpen, setIsFriendRequestsOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  
  // Notifications State
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  // API Functions
  const searchUsersAPI = async (query: string) => {
    if (!query.trim()) {
      setSearchUsers([]);
      return;
    }

    try {
      setIsSearchingUsers(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const users = await response.json();
        setSearchUsers(users);
        
        // Fetch friend request status for each user
        for (const user of users) {
          try {
            const statusResponse = await fetch(`/api/friends/status/${user.id}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });
            if (statusResponse.ok) {
              const { status } = await statusResponse.json();
              setFriendRequestStatus(prev => ({ ...prev, [user.id]: status }));
            }
          } catch (error) {
            console.error('Error fetching friend status:', error);
          }
        }
      } else {
        throw new Error('Failed to search users');
      }
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: "Error",
        description: "Failed to search users",
        variant: "destructive",
      });
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const sendFriendRequest = async (friendId: number) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/friends/request', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ friendId }),
      });

      if (response.ok) {
        toast({
          title: "Friend Request Sent",
          description: "Your friend request has been sent successfully!",
        });
        
        // Update the button status
        setFriendRequestStatus(prev => ({ ...prev, [friendId]: 'sent' }));
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send friend request');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send friend request",
        variant: "destructive",
      });
    }
  };

  const fetchPendingRequests = async () => {
    try {
      setIsLoadingRequests(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/friends/pending', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const requests = await response.json();
        setPendingRequests(requests);
      } else {
        throw new Error('Failed to fetch pending requests');
      }
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      toast({
        title: "Error",
        description: "Failed to load friend requests",
        variant: "destructive",
      });
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const acceptFriendRequest = async (friendId: number) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/friends/accept', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ friendId }),
      });
      
      if (response.ok) {
        toast({
          title: "Friend Request Accepted",
          description: "You are now friends!",
        });
        
        // Remove from pending requests
        setPendingRequests(prev => prev.filter(req => req.id !== friendId));
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to accept friend request');
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to accept friend request",
        variant: "destructive",
      });
    }
  };

  const declineFriendRequest = async (friendId: number) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/friends/reject', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ friendId }),
      });

      if (response.ok) {
        toast({
          title: "Friend Request Declined",
          description: "Friend request has been declined",
        });
        
        // Remove from pending requests
        setPendingRequests(prev => prev.filter(req => req.id !== friendId));
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to decline friend request');
      }
    } catch (error) {
      console.error('Error declining friend request:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to decline friend request",
        variant: "destructive",
      });
    }
  };

  // Notification API Functions
  const fetchNotifications = async () => {
    try {
      setIsLoadingNotifications(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const notificationsData = await response.json();
        setNotifications(notificationsData);
      } else {
        throw new Error('Failed to fetch notifications');
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive",
      });
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/notifications/unread-count', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const { count } = await response.json();
        setUnreadCount(count);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const markNotificationAsRead = async (notificationId: number) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
    },
  });

      if (response.ok) {
        // Update local state
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId ? { ...notif, isRead: true } : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Effects
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (userSearchQuery.trim()) {
        searchUsersAPI(userSearchQuery);
      } else {
        setSearchUsers([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [userSearchQuery]);

  useEffect(() => {
    if (isFriendRequestsOpen) {
      fetchPendingRequests();
    }
  }, [isFriendRequestsOpen]);

  useEffect(() => {
    if (isNotificationsOpen) {
      fetchNotifications();
    }
  }, [isNotificationsOpen]);

  useEffect(() => {
    // Fetch unread count on component mount
    fetchUnreadCount();
  }, []);

  const filteredConversations = mockConversations.filter(conv => {
    const matchesSearch = conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         conv.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesArchive = showArchived ? conv.isArchived : !conv.isArchived;
    return matchesSearch && matchesArchive;
  });

  const pinnedConversations = filteredConversations.filter(conv => conv.isPinned);
  const regularConversations = filteredConversations.filter(conv => !conv.isPinned);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      // TODO: Implement message sending
      console.log('Sending message:', newMessage);
      setNewMessage("");
    }
  };
    
    return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className={`bg-white border-b border-gray-200 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'px-8 py-6' : 'p-6'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
              <p className="text-sm text-gray-500">Stay connected with your study community</p>
            </div>
          </div>
           <div className="flex items-center space-x-3">
             <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
               <DialogTrigger asChild>
                 <Button variant="outline" size="sm">
                   <UserPlus className="w-4 h-4 mr-2" />
                   New Chat
            </Button>
               </DialogTrigger>
               <DialogContent className="max-w-md">
                 <DialogHeader>
                   <DialogTitle>Start New Chat</DialogTitle>
                 </DialogHeader>
                 <div className="space-y-4">
                   <div>
                     <Input
                       placeholder="Search users..."
                       value={userSearchQuery}
                       onChange={(e) => setUserSearchQuery(e.target.value)}
                       className="w-full"
                     />
          </div>
                   <div className="space-y-2 max-h-60 overflow-y-auto">
                     {isSearchingUsers ? (
                       <div className="flex items-center justify-center py-8">
                         <Loader2 className="w-6 h-6 animate-spin" />
        </div>
                     ) : searchUsers.length === 0 ? (
                       <p className="text-gray-500 text-center py-8">
                         {userSearchQuery ? "No users found" : "Search for users to start a chat"}
                       </p>
                     ) : (
                       searchUsers.map((user) => (
                         <div key={user.id} className="flex items-center justify-between p-3 border rounded-xl bg-gray-50">
                           <div className="flex items-center space-x-3">
                             <Avatar className="w-10 h-10">
                               <AvatarFallback className="bg-blue-500 text-white">
                                 {user.name.charAt(0).toUpperCase()}
                               </AvatarFallback>
                             </Avatar>
                             <div>
                               <p className="font-semibold text-gray-900">{user.name}</p>
                               <p className="text-sm text-gray-600">{user.email}</p>
                </div>
              </div>
            <Button
                             size="sm"
                             onClick={() => sendFriendRequest(user.id)}
                             disabled={friendRequestStatus[user.id] === 'sent' || friendRequestStatus[user.id] === 'accepted' || friendRequestStatus[user.id] === 'received'}
                             className={
                               friendRequestStatus[user.id] === 'sent' 
                                 ? "bg-gray-400 text-white cursor-not-allowed" 
                                 : friendRequestStatus[user.id] === 'accepted'
                                 ? "bg-green-500 text-white cursor-not-allowed"
                                 : friendRequestStatus[user.id] === 'received'
                                 ? "bg-orange-500 text-white cursor-not-allowed"
                                 : "bg-blue-500 hover:bg-blue-600 text-white"
                             }
                           >
                             {friendRequestStatus[user.id] === 'sent' 
                               ? 'Requested' 
                               : friendRequestStatus[user.id] === 'accepted'
                               ? 'Friends'
                               : friendRequestStatus[user.id] === 'received'
                               ? 'Respond'
                               : 'Add Friend'
                             }
            </Button>
          </div>
                       ))
                     )}
      </div>
                 </div>
               </DialogContent>
             </Dialog>

             <Dialog open={isFriendRequestsOpen} onOpenChange={setIsFriendRequestsOpen}>
               <DialogTrigger asChild>
                 <Button variant="outline" size="sm" className="relative">
                   <Users className="w-4 h-4 mr-2" />
                   Friend Requests
                   {pendingRequests.length > 0 && (
                     <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1.5 py-0.5">
                       {pendingRequests.length}
                     </Badge>
                   )}
                 </Button>
               </DialogTrigger>
               <DialogContent className="max-w-md">
                 <DialogHeader>
                   <DialogTitle>Friend Requests</DialogTitle>
                 </DialogHeader>
                 <div className="space-y-4">
                   {isLoadingRequests ? (
                     <div className="flex items-center justify-center py-8">
                       <Loader2 className="w-6 h-6 animate-spin" />
            </div>
                   ) : pendingRequests.length === 0 ? (
                     <p className="text-gray-500 text-center py-8">No pending friend requests</p>
                   ) : (
                     pendingRequests.map((request) => (
                       <div key={request.id} className="flex items-center justify-between p-4 border rounded-xl bg-gray-50">
                         <div className="flex items-center space-x-3">
                           <Avatar className="w-12 h-12">
                             <AvatarFallback className="bg-blue-500 text-white">
                               {request.name?.charAt(0).toUpperCase() || 'U'}
                             </AvatarFallback>
                           </Avatar>
            <div>
                             <p className="font-semibold text-gray-900">{request.name}</p>
                             <p className="text-sm text-gray-600">{request.email}</p>
              </div>
            </div>
                         <div className="flex space-x-2">
          <Button
                             size="sm"
                             onClick={() => acceptFriendRequest(request.id)}
                             className="bg-green-500 hover:bg-green-600 text-white"
                           >
                             Accept
          </Button>
          <Button
                             size="sm"
                             variant="outline"
                             onClick={() => declineFriendRequest(request.id)}
                           >
                             Decline
          </Button>
        </div>
              </div>
                     ))
                   )}
                            </div>
               </DialogContent>
             </Dialog>

             <Dialog open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
               <DialogTrigger asChild>
                 <Button variant="outline" size="sm" className="relative">
                   <Bell className="w-4 h-4 mr-2" />
                   Notifications
                   {unreadCount > 0 && (
                     <Badge className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-1.5 py-0.5">
                       {unreadCount}
                     </Badge>
                   )}
                </Button>
               </DialogTrigger>
               <DialogContent className="max-w-md">
                 <DialogHeader>
                   <DialogTitle>Notifications</DialogTitle>
                 </DialogHeader>
                 <div className="space-y-4">
                   {isLoadingNotifications ? (
                     <div className="flex items-center justify-center py-8">
                       <Loader2 className="w-6 h-6 animate-spin" />
              </div>
                   ) : notifications.length === 0 ? (
                     <p className="text-gray-500 text-center py-8">No notifications</p>
                   ) : (
                     notifications.map((notification) => (
                       <div 
                         key={notification.id} 
                         className={`flex items-start space-x-3 p-3 border rounded-xl cursor-pointer hover:bg-gray-50 ${
                           !notification.isRead ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                         }`}
                         onClick={() => markNotificationAsRead(notification.id)}
                       >
                         <div className="flex-1">
                           <p className="font-semibold text-gray-900">{notification.title}</p>
                           <p className="text-sm text-gray-600">{notification.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                             {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                         {!notification.isRead && (
                           <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              )}
            </div>
                     ))
                   )}
                    </div>
               </DialogContent>
             </Dialog>
             <Button variant="outline" size="sm">
               <Users className="w-4 h-4 mr-2" />
               Create Group
             </Button>
                                  </div>
                                  </div>
                                </div>

      {/* Main Content */}
      <div className={`max-w-6xl mx-auto p-6 transition-all duration-300 ease-in-out ${isCollapsed ? 'max-w-7xl' : ''}`}>
        {selectedConversation ? (
          /* Chat View */
          <div className={`bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col transition-all duration-300 ease-in-out ${
            isCollapsed ? 'h-[calc(100vh-180px)]' : 'h-[calc(100vh-200px)]'
          }`}>
        {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
                                      <Button
              variant="ghost"
                                        size="sm"
                  onClick={() => setSelectedConversation(null)}
              className="p-2"
                                      >
              ←
                                      </Button>
                <div className="relative">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={selectedConversation.avatar || undefined} />
                    <AvatarFallback className="bg-blue-500 text-white">
                      {getInitials(selectedConversation.name)}
                    </AvatarFallback>
                  </Avatar>
                  {selectedConversation.isOnline && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
                  )}
                                </div>
            <div>
                  <h2 className="font-semibold text-gray-900">{selectedConversation.name}</h2>
                  <p className="text-sm text-gray-500">{selectedConversation.lastSeen}</p>
                          </div>
                          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <Phone className="w-4 h-4" />
                          </Button>
            <Button variant="ghost" size="sm">
              <Video className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

        {/* Messages */}
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                {mockMessages.map((message) => (
            <div
              key={message.id}
                    className={cn(
                      "flex",
                      message.senderId === 0 ? "justify-end" : "justify-start"
                    )}
                  >
                    <div className={cn(
                      "max-w-xs lg:max-w-md px-4 py-2 rounded-lg",
                      message.senderId === 0
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-900"
                    )}>
                  <p className="text-sm">{message.content}</p>
                      <div className={cn(
                        "flex items-center justify-end mt-1 text-xs",
                        message.senderId === 0 ? "text-blue-100" : "text-gray-500"
                      )}>
                        <span>{message.timestamp}</span>
                        {message.senderId === 0 && (
                          <div className="ml-1">
                            {message.isRead ? (
                              <CheckCheck className="w-3 h-3" />
                            ) : message.isDelivered ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                        </div>
                        )}
                            </div>
                          </div>
                        </div>
          ))}
                      </div>
            </ScrollArea>

        {/* Message Input */}
            <div className="p-4 border-t border-gray-200">
              <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
                <Button variant="ghost" size="sm" type="button">
                  <Paperclip className="w-4 h-4" />
                </Button>
                <div className="flex-1 relative">
                <Input
                  value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="pr-20"
                  />
                  <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 transform -translate-y-1/2">
                    <Smile className="w-4 h-4" />
            </Button>
                    </div>
                <Button variant="ghost" size="sm" type="button">
                  <Mic className="w-4 h-4" />
                </Button>
                <Button type="submit" disabled={!newMessage.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
        </form>
                </div>
            </div>
        ) : (
          /* Conversations List View */
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                    placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                      </div>
                       <div className="flex space-x-2">
                               <Button
                    variant={!showArchived ? "default" : "outline"}
                                   size="sm"
                    onClick={() => setShowArchived(false)}
                                 >
                    Active
                                 </Button>
                                 <Button
                    variant={showArchived ? "default" : "outline"}
                                   size="sm"
                    onClick={() => setShowArchived(true)}
                                 >
                    Archived
                                 </Button>
                               </div>
                       </div>
                    </div>

            {/* Conversations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Pinned Conversations */}
              {pinnedConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation)}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start space-x-3">
                    <div className="relative">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={conversation.avatar || undefined} />
                        <AvatarFallback className="bg-blue-500 text-white">
                          {getInitials(conversation.name)}
                        </AvatarFallback>
                      </Avatar>
                      {conversation.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
                      )}
                      <div className="absolute -top-1 -right-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
            </div>
              </div>
                    
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {conversation.name}
                        </h3>
                        <div className="flex items-center space-x-1">
                              {conversation.unreadCount > 0 && (
                            <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                                  {conversation.unreadCount}
                                </Badge>
                              )}
                          <span className="text-xs text-gray-500">
                            {conversation.timestamp}
                              </span>
              </div>
              </div>
                      <p className="text-sm text-gray-600 truncate mt-1">
                        {conversation.lastMessage}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                        {conversation.lastSeen}
                          </p>
            </div>
                    </div>
                    </div>
                  ))}

              {/* Regular Conversations */}
              {regularConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation)}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start space-x-3">
                    <div className="relative">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={conversation.avatar || undefined} />
                        <AvatarFallback className="bg-gray-500 text-white">
                          {getInitials(conversation.name)}
                        </AvatarFallback>
                      </Avatar>
                      {conversation.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
                      )}
                    </div>
                    
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {conversation.name}
                        </h3>
                        <div className="flex items-center space-x-1">
                          {conversation.unreadCount > 0 && (
                            <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                          <span className="text-xs text-gray-500">
                            {conversation.timestamp}
                        </span>
                      </div>
                      </div>
                      <p className="text-sm text-gray-600 truncate mt-1">
                        {conversation.lastMessage}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                        {conversation.lastSeen}
                          </p>
                      </div>
                  </div>
                    </div>
                  ))}

              {/* Empty State */}
              {filteredConversations.length === 0 && (
                <div className="col-span-full">
                  <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
                    <MessageCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {searchQuery ? "No conversations found" : "No conversations yet"}
                    </h3>
                    <p className="text-gray-500 mb-4">
                      {searchQuery ? "Try a different search term" : "Start a new conversation to get started"}
                    </p>
                    {!searchQuery && (
                      <Button>
                      <UserPlus className="w-4 h-4 mr-2" />
                        Start New Chat
                    </Button>
              )}
                  </div>
                </div>
              )}
              </div>
                      </div>
                    )}
        </div>
      </div>
    );
  }
