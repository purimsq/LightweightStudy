import { useState, useEffect } from "react";
import { MessageCircle, Users, Search, Send, Plus, UserPlus, Check, X, Settings, MoreVertical, Phone, Video, Info, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: number;
  username: string;
  name: string;
  avatar: string;
  isActive: boolean;
  lastLoginDate?: string;
  friendStatus?: string;
}

interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  messageType: string;
  isRead: boolean;
  createdAt: string;
}

interface Conversation {
  id: number;
  username: string;
  name: string;
  avatar: string;
  isActive: boolean;
  lastMessage?: Message;
  unreadCount: number;
}

interface Group {
  id: number;
  name: string;
  description?: string;
  avatar?: string;
  createdBy: number;
  isActive: boolean;
  memberCount: number;
  lastMessage?: Message;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'conversations' | 'requests' | 'friends' | 'search' | 'groups'>('conversations');
  const [selectedFriend, setSelectedFriend] = useState<User | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [sentRequests, setSentRequests] = useState<Set<number>>(new Set());

  // Fetch conversations
  const { data: conversations = [] } = useQuery({
    queryKey: ["/api/messages/conversations"],
  });

  // Fetch friends
  const { data: friends = [] } = useQuery({
    queryKey: ["/api/friends"],
  });

  // Fetch pending friend requests
  const { data: pendingRequests = [] } = useQuery({
    queryKey: ["/api/friends/pending"],
  });

  // Fetch all friend requests
  const { data: allFriendRequests = [] } = useQuery({
    queryKey: ["/api/friends/all"],
  });

  // Fetch groups
  const { data: groups = [] } = useQuery({
    queryKey: ["/api/groups"],
  });

  // Fetch messages for selected friend
  const { data: messages = [] } = useQuery({
    queryKey: selectedGroup ? ["/api/groups", selectedGroup.id, "messages"] : ["/api/messages", selectedFriend?.id],
    enabled: !!selectedFriend || !!selectedGroup,
  });

  // Search users
  const { data: searchResults = [] } = useQuery({
    queryKey: [`/api/users/search?q=${searchQuery}`],
    enabled: activeTab === 'search', // Always fetch when on search tab
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const token = localStorage.getItem('authToken');
      const url = selectedGroup 
        ? `/api/groups/${selectedGroup.id}/messages`
        : '/api/messages';
      
      const body = selectedGroup
        ? { content, messageType: 'text' }
        : { receiverId: selectedFriend?.id, content, messageType: 'text' };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: () => {
      setNewMessage('');
      if (selectedGroup) {
        queryClient.invalidateQueries({ queryKey: ["/api/groups", selectedGroup.id, "messages"] });
        queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedFriend?.id] });
        queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      }
    },
  });

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: groupName,
          description: groupDescription,
          memberIds: selectedMembers
        }),
      });
      if (!response.ok) throw new Error('Failed to create group');
      return response.json();
    },
    onSuccess: () => {
      setGroupName('');
      setGroupDescription('');
      setSelectedMembers([]);
      setShowCreateGroup(false);
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
    },
  });

  // Send friend request mutation
  const sendFriendRequestMutation = useMutation({
    mutationFn: async (friendId: number) => {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/friends/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ friendId }),
      });
      if (!response.ok) throw new Error('Failed to send friend request');
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends/sent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends/all"] });
      setSentRequests(prev => new Set([...prev, variables]));
      toast.success('Friend request sent!');
    },
    onError: (error) => {
      console.error('Friend request error:', error);
      toast.error('Failed to send friend request. Please try again.');
    },
  });

  // Accept friend request mutation
  const acceptFriendRequestMutation = useMutation({
    mutationFn: async (friendId: number) => {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/friends/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ friendId }),
      });
      if (!response.ok) throw new Error('Failed to accept friend request');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends/sent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      toast.success('Friend request accepted!');
    },
    onError: (error) => {
      console.error('Accept friend request error:', error);
      toast.error('Failed to accept friend request. Please try again.');
    },
  });

  // Reject friend request mutation
  const rejectFriendRequestMutation = useMutation({
    mutationFn: async (friendId: number) => {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/friends/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ friendId }),
      });
      if (!response.ok) throw new Error('Failed to reject friend request');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends/sent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends/all"] });
      toast.success('Friend request rejected');
    },
    onError: (error) => {
      console.error('Reject friend request error:', error);
      toast.error('Failed to reject friend request. Please try again.');
    },
  });

  // Delete friend request mutation
  const deleteFriendRequestMutation = useMutation({
    mutationFn: async (friendId: number) => {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/friends/request/${friendId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to delete friend request');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends/sent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends/all"] });
      toast.success('Friend request deleted');
    },
    onError: (error) => {
      console.error('Delete friend request error:', error);
      toast.error('Failed to delete friend request. Please try again.');
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && selectedFriend) {
      sendMessageMutation.mutate(newMessage.trim());
    }
  };

  const handleSendFriendRequest = (friendId: number) => {
    sendFriendRequestMutation.mutate(friendId);
  };

  const handleAcceptFriendRequest = (friendId: number) => {
    acceptFriendRequestMutation.mutate(friendId);
  };

  const handleRejectFriendRequest = (friendId: number) => {
    rejectFriendRequestMutation.mutate(friendId);
  };

  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const handleViewProfile = (user: User) => {
    setProfileUser(user);
    setShowUserProfile(true);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (selectedFriend || selectedGroup) {
    const chatName = selectedGroup ? selectedGroup.name : selectedFriend?.name;
    const chatAvatar = selectedGroup ? selectedGroup.avatar : selectedFriend?.avatar;
    const isGroup = !!selectedGroup;
    
    return (
      <div className="flex flex-col h-screen">
        {/* Chat Header */}
        <div className="bg-white border-b p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedFriend(null);
                setSelectedGroup(null);
              }}
              className="p-2"
            >
              ←
            </Button>
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-medium">
              {isGroup ? getInitials(selectedGroup.name) : getInitials(selectedFriend?.name || '')}
            </div>
            <div>
              <h2 className="font-semibold">{chatName}</h2>
              <p className="text-sm text-gray-500">
                {isGroup 
                  ? `${selectedGroup.memberCount} members` 
                  : selectedFriend?.isActive ? 'Online' : 'Offline'
                }
              </p>
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
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message: Message) => (
            <div
              key={message.id}
              className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div className="max-w-xs lg:max-w-md">
                {isGroup && message.senderId !== user?.id && (
                  <p className="text-xs text-gray-500 mb-1 px-2">
                    {message.senderId === user?.id ? 'You' : `User ${message.senderId}`}
                  </p>
                )}
                <div
                  className={`px-4 py-2 rounded-lg ${
                    message.senderId === user?.id
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.senderId === user?.id ? 'text-primary-100' : 'text-gray-500'
                  }`}>
                    {formatTime(message.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="bg-white border-t p-4">
          <div className="flex space-x-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={!newMessage.trim() || sendMessageMutation.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
              <div className="w-2 h-2 bg-green-500 rounded-full inline-block ml-2" />
            </div>
          </div>
          <Button
            onClick={() => setActiveTab('requests')}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Requests
            {allFriendRequests.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {allFriendRequests.length}
              </Badge>
            )}
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6">
          <Button
            variant={activeTab === 'conversations' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('conversations')}
            className="flex items-center space-x-2"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Chats</span>
            {(conversations.length + groups.length) > 0 && (
              <Badge variant="secondary" className="ml-2">
                {conversations.length + groups.length}
              </Badge>
            )}
          </Button>
          <Button
            variant={activeTab === 'groups' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('groups')}
            className="flex items-center space-x-2"
          >
            <Users className="w-4 h-4" />
            <span>Groups</span>
            {groups.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {groups.length}
              </Badge>
            )}
          </Button>
          <Button
            variant={activeTab === 'friends' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('friends')}
            className="flex items-center space-x-2"
          >
            <Users className="w-4 h-4" />
            <span>Friends</span>
            {friends.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {friends.length}
              </Badge>
            )}
          </Button>
          <Button
            variant={activeTab === 'search' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('search')}
            className="flex items-center space-x-2"
          >
            <Search className="w-4 h-4" />
            <span>Search</span>
          </Button>
        </div>

        {/* Content */}
        <Card className="p-6">
          {activeTab === 'conversations' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  All Chats
                </h2>
                <Button
                  onClick={() => setShowCreateGroup(true)}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Group
                </Button>
              </div>
              
              {(conversations.length === 0 && groups.length === 0) ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No chats yet</p>
                  <p className="text-sm">Add friends or create a group to start chatting!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Individual Conversations */}
                  {conversations.map((conversation: Conversation) => (
                    <div
                      key={`conv-${conversation.id}`}
                      onClick={() => {
                        setSelectedFriend(conversation);
                        setSelectedGroup(null);
                      }}
                      className="p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-medium">
                          {getInitials(conversation.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900">{conversation.name}</h3>
                            <div className="flex items-center space-x-2">
                              {conversation.unreadCount > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {conversation.unreadCount}
                                </Badge>
                              )}
                              <span className="text-sm text-gray-500">
                                {conversation.lastMessage ? formatTime(conversation.lastMessage.createdAt) : ''}
                              </span>
                            </div>
                          </div>
                          <p className="text-gray-600 text-sm mt-1 truncate">
                            {conversation.lastMessage?.content || 'No messages yet'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Group Conversations */}
                  {groups.map((group: Group) => (
                    <div
                      key={`group-${group.id}`}
                      onClick={() => {
                        setSelectedGroup(group);
                        setSelectedFriend(null);
                      }}
                      className="p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-medium">
                          {getInitials(group.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900">{group.name}</h3>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-500">
                                {group.lastMessage ? formatTime(group.lastMessage.createdAt) : ''}
                              </span>
                            </div>
                          </div>
                          <p className="text-gray-600 text-sm mt-1 truncate">
                            {group.lastMessage?.content || 'No messages yet'}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {group.memberCount} members
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'groups' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Groups
                </h2>
                <Button
                  onClick={() => setShowCreateGroup(true)}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Group
                </Button>
              </div>
              
              {groups.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No groups yet</p>
                  <p className="text-sm">Create a group to start chatting with multiple friends!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {groups.map((group: Group) => (
                    <div
                      key={group.id}
                      onClick={() => {
                        setSelectedGroup(group);
                        setSelectedFriend(null);
                      }}
                      className="p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-medium">
                          {getInitials(group.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900">{group.name}</h3>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-500">
                                {group.lastMessage ? formatTime(group.lastMessage.createdAt) : ''}
                              </span>
                            </div>
                          </div>
                          <p className="text-gray-600 text-sm mt-1 truncate">
                            {group.description || 'No description'}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {group.memberCount} members
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

            {activeTab === 'requests' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <UserPlus className="w-5 h-5 mr-2" />
                  Friend Requests
                </h2>
                
                {/* All Requests */}
                {allFriendRequests.length > 0 ? (
                  <div className="space-y-2">
                    {allFriendRequests.map((request: any) => (
                      <Card key={`${request.requestType}-${request.id}`} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-medium">
                              {getInitials(request.name)}
                            </div>
                            <div>
                              <h4 className="font-medium">{request.name}</h4>
                              <p className="text-sm text-gray-500">@{request.username}</p>
                              <p className="text-xs text-gray-400">
                                {request.requestType === 'sent' ? 'You sent a request' : 'Sent you a request'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {/* Status Badge */}
                            <Badge 
                              variant={request.friendStatus === 'accepted' ? 'default' : 
                                      request.friendStatus === 'rejected' ? 'destructive' : 
                                      'secondary'}
                              className={
                                request.friendStatus === 'accepted' ? 'bg-green-100 text-green-800' :
                                request.friendStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }
                            >
                              {request.friendStatus === 'accepted' ? 'Accepted' :
                               request.friendStatus === 'rejected' ? 'Rejected' :
                               'Pending'}
                            </Badge>
                            
                            {/* Action Buttons */}
                            {request.requestType === 'received' && request.friendStatus === 'pending' && (
                              <div className="flex space-x-1">
                                <Button
                                  size="sm"
                                  onClick={() => handleAcceptFriendRequest(request.id)}
                                  disabled={acceptFriendRequestMutation.isPending}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Check className="w-4 h-4 mr-1" />
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRejectFriendRequest(request.id)}
                                  disabled={rejectFriendRequestMutation.isPending}
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            )}
                            
                            {/* Delete Button */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteFriendRequestMutation.mutate(request.id)}
                              disabled={deleteFriendRequestMutation.isPending}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <UserPlus className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No friend requests</p>
                    <p className="text-sm">Send friend requests to start connecting!</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'friends' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Friends
              </h2>
              
              {pendingRequests.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-md font-medium text-gray-700 mb-3">Pending Requests</h3>
                  <div className="space-y-3">
                    {pendingRequests.map((request: User) => (
                      <div key={request.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-medium">
                            {getInitials(request.name)}
                          </div>
                          <div>
                            <h4 className="font-medium">{request.name}</h4>
                            <p className="text-sm text-gray-500">@{request.username}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleAcceptFriendRequest(request.id)}
                            disabled={acceptFriendRequestMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectFriendRequest(request.id)}
                            disabled={rejectFriendRequestMutation.isPending}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {friends.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No friends yet</p>
                  <p className="text-sm">Search for users to add as friends!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {friends.map((friend: User) => (
                    <div
                      key={friend.id}
                      onClick={() => setSelectedFriend(friend)}
                      className="p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-medium">
                          {getInitials(friend.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900">{friend.name}</h3>
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${friend.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                              <span className="text-sm text-gray-500">
                                {friend.isActive ? 'Online' : 'Offline'}
                              </span>
                            </div>
                          </div>
                          <p className="text-gray-600 text-sm">@{friend.username}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'search' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Search className="w-5 h-5 mr-2" />
                Search Users
              </h2>
              
              <div className="mb-4">
                <Input
                  placeholder="Search by username, name, or email... (or leave empty to see all users)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>

              {searchResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No users found</p>
                  <p className="text-sm">Try a different search term or check if there are other users in the app</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 mb-4">
                    {searchQuery ? `Found ${searchResults.length} user(s) matching "${searchQuery}"` : `All users (${searchResults.length} total)`}
                  </div>
                  {searchResults.map((user: User) => (
                    <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-medium">
                          {getInitials(user.name)}
                        </div>
                        <div>
                          <h4 className="font-medium">{user.name}</h4>
                          <p className="text-sm text-gray-500">@{user.username}</p>
                          <p className="text-sm text-gray-400">{user.email}</p>
                        </div>
                      </div>
                       <div className="flex space-x-2">
                         <Button
                           variant="outline"
                           onClick={() => handleViewProfile(user)}
                         >
                           <Info className="w-4 h-4 mr-2" />
                           View Profile
                         </Button>
                         <Button
                           onClick={() => handleSendFriendRequest(user.id)}
                           disabled={sendFriendRequestMutation.isPending || sentRequests.has(user.id)}
                           className={sentRequests.has(user.id) ? "bg-green-600 hover:bg-green-700" : "bg-primary hover:bg-primary/90"}
                         >
                           <UserPlus className="w-4 h-4 mr-2" />
                           {sentRequests.has(user.id) ? 'Request Sent' : sendFriendRequestMutation.isPending ? 'Sending...' : 'Add Friend'}
                         </Button>
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Create Group Dialog */}
        <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="groupName">Group Name</Label>
                <Input
                  id="groupName"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name"
                />
              </div>
              <div>
                <Label htmlFor="groupDescription">Description (Optional)</Label>
                <Textarea
                  id="groupDescription"
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="Enter group description"
                />
              </div>
              <div>
                <Label>Add Members</Label>
                <div className="max-h-40 overflow-y-auto space-y-2 mt-2">
                  {friends.map((friend: User) => (
                    <div key={friend.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`member-${friend.id}`}
                        checked={selectedMembers.includes(friend.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMembers([...selectedMembers, friend.id]);
                          } else {
                            setSelectedMembers(selectedMembers.filter(id => id !== friend.id));
                          }
                        }}
                        className="rounded"
                      />
                      <label htmlFor={`member-${friend.id}`} className="flex items-center space-x-2 cursor-pointer">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {getInitials(friend.name)}
                        </div>
                        <span className="text-sm">{friend.name}</span>
                      </label>
                    </div>
                  ))}
                </div>
                {friends.length === 0 && (
                  <p className="text-sm text-gray-500">Add friends first to create a group</p>
                )}
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateGroup(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => createGroupMutation.mutate()}
                  disabled={!groupName.trim() || createGroupMutation.isPending}
                  className="bg-primary hover:bg-primary/90"
                >
                  {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
                </Button>
              </div>
            </div>
            </DialogContent>
          </Dialog>

          {/* User Profile Dialog */}
          <Dialog open={showUserProfile} onOpenChange={setShowUserProfile}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>User Profile</DialogTitle>
              </DialogHeader>
              {profileUser && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-medium">
                      {getInitials(profileUser.name)}
                    </div>
                    <div className="text-center">
                      <h3 className="text-xl font-semibold">{profileUser.name}</h3>
                      <p className="text-gray-500">@{profileUser.username}</p>
                      <p className="text-sm text-gray-400">{profileUser.email}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Status:</span>
                      <Badge variant={profileUser.isActive ? "default" : "secondary"}>
                        {profileUser.isActive ? "Online" : "Offline"}
                      </Badge>
                    </div>
                    
                    {profileUser.lastLoginDate && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Last Active:</span>
                        <span className="text-sm text-gray-500">
                          {new Date(profileUser.lastLoginDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    
                    {profileUser.bio && (
                      <div>
                        <span className="text-sm font-medium">Bio:</span>
                        <p className="text-sm text-gray-600 mt-1">{profileUser.bio}</p>
                      </div>
                    )}
                    
                    {profileUser.location && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Location:</span>
                        <span className="text-sm text-gray-500">{profileUser.location}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-2 pt-4">
                    <Button
                      onClick={() => {
                        handleSendFriendRequest(profileUser.id);
                        setShowUserProfile(false);
                      }}
                      disabled={sendFriendRequestMutation.isPending || sentRequests.has(profileUser.id)}
                      className={sentRequests.has(profileUser.id) ? "flex-1 bg-green-600 hover:bg-green-700" : "flex-1 bg-primary hover:bg-primary/90"}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      {sentRequests.has(profileUser.id) ? 'Request Sent' : sendFriendRequestMutation.isPending ? 'Sending...' : 'Add Friend'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowUserProfile(false)}
                      className="flex-1"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }
