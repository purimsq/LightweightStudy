import { useState } from "react";
import { Mail, Plus, ArrowLeft, Send, Archive, Reply, Forward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Email {
  id: string;
  sender: string;
  subject: string;
  preview: string;
  date: string;
  time: string;
  isRead: boolean;
  status?: 'delivered' | 'failed';
}

const mockEmails: Email[] = [
  {
    id: "1",
    sender: "Mitchell",
    subject: "Study Session Reminder",
    preview: "Hi! Just wanted to remind you about our study session tomorrow at 2 PM in the library. We'll be going over the cardiovascular system chapter. Don't forget to bring your notes and any questions you might have. Looking forward to seeing you there!",
    date: "Wednesday, September 17, 2025",
    time: "2 hours ago",
    isRead: false,
  },
  {
    id: "2",
    sender: "Professor Johnson",
    subject: "Assignment Feedback - Anatomy Lab Report",
    preview: "Great work on your recent anatomy lab report! Your understanding of the cardiovascular system is excellent. I particularly liked how you explained the blood flow through the heart chambers. Keep up the good work!",
    date: "Tuesday, September 16, 2025",
    time: "1 day ago",
    isRead: true,
  },
  {
    id: "3",
    sender: "Library Services",
    subject: "Book Renewal Notice",
    preview: "Your borrowed books are due for renewal. Please visit the library or use our online system to extend your borrowing period. Books: Advanced Physiology Textbook, Clinical Medicine Guide.",
    date: "Sunday, September 14, 2025",
    time: "3 days ago",
    isRead: true,
  },
];

const mockSentEmails: Email[] = [
  {
    id: "4",
    sender: "Professor Johnson",
    subject: "Question about Assignment Due Date",
    preview: "Dear Professor Johnson, I hope this email finds you well. I was wondering if it would be possible to extend the due date for the anatomy lab report by one day. I've been working hard on it but need a bit more time to ensure quality.",
    date: "Tuesday, September 16, 2025",
    time: "1 day ago",
    isRead: true,
    status: 'delivered',
  },
  {
    id: "5",
    sender: "Study Group",
    subject: "Meeting Time Change",
    preview: "Hi everyone, I need to change our study group meeting from 2 PM to 3 PM tomorrow due to a scheduling conflict. Please let me know if this works for everyone.",
    date: "Monday, September 15, 2025",
    time: "2 days ago",
    isRead: true,
    status: 'delivered',
  },
  {
    id: "6",
    sender: "Library Services",
    subject: "Book Request",
    preview: "Hello, I would like to request the following books: - Advanced Physiology Textbook - Clinical Medicine Guide. Please let me know when they will be available.",
    date: "Sunday, September 14, 2025",
    time: "3 days ago",
    isRead: true,
    status: 'failed',
  },
];

export default function MailPage() {
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [showCompose, setShowCompose] = useState(false);

  const emails = activeTab === 'received' ? mockEmails : mockSentEmails;

  const getSenderInitial = (sender: string) => {
    return sender.charAt(0).toUpperCase();
  };

  const getStatusIcon = (status?: string) => {
    if (status === 'delivered') {
      return <div className="w-2 h-2 bg-green-500 rounded-full" />;
    } else if (status === 'failed') {
      return <div className="w-2 h-2 bg-red-500 rounded-full" />;
    }
    return null;
  };

  const getStatusText = (status?: string) => {
    if (status === 'delivered') {
      return 'delivered';
    } else if (status === 'failed') {
      return 'failed';
    }
    return '';
  };

  if (selectedEmail) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedEmail(null)}
                className="p-2"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Mail className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Mail</h1>
                  <div className="w-2 h-2 bg-red-500 rounded-full inline-block ml-2" />
                </div>
              </div>
            </div>
            <Button
              onClick={() => setShowCompose(true)}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Compose
            </Button>
          </div>

          {/* Email Content */}
          <Card className="p-6">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedEmail.subject}</h2>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>From: {selectedEmail.sender}</span>
                <span>Date: {selectedEmail.date}</span>
                <span>Time: {selectedEmail.time}</span>
              </div>
            </div>
            
            <div className="prose max-w-none">
              <p className="text-gray-700 leading-relaxed">
                {selectedEmail.preview}
              </p>
            </div>

            <div className="flex space-x-3 mt-6">
              <Button className="bg-primary hover:bg-primary/90 text-white">
                <Reply className="w-4 h-4 mr-2" />
                Reply
              </Button>
              <Button variant="outline">
                <Forward className="w-4 h-4 mr-2" />
                Forward
              </Button>
              <Button variant="outline">
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </Button>
            </div>
          </Card>
        </div>
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
              <Mail className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mail</h1>
              <div className="w-2 h-2 bg-red-500 rounded-full inline-block ml-2" />
            </div>
          </div>
          <Button
            onClick={() => setShowCompose(true)}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Compose
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6">
          <Button
            variant={activeTab === 'received' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('received')}
            className="flex items-center space-x-2"
          >
            <Mail className="w-4 h-4" />
            <span>Received</span>
            {activeTab === 'received' && <div className="w-2 h-2 bg-red-500 rounded-full" />}
          </Button>
          <Button
            variant={activeTab === 'sent' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('sent')}
            className="flex items-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>Sent</span>
          </Button>
        </div>

        {/* Email List */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Mail className="w-5 h-5 mr-2" />
            {activeTab === 'received' ? 'Received Emails' : 'Sent Emails'}
          </h2>
          
          <div className="space-y-4">
            {emails.map((email) => (
              <div
                key={email.id}
                onClick={() => setSelectedEmail(email)}
                className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                  email.isRead ? 'bg-white' : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-medium">
                    {getSenderInitial(email.sender)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">{email.sender}</h3>
                      <div className="flex items-center space-x-2">
                        {!email.isRead && <div className="w-2 h-2 bg-red-500 rounded-full" />}
                        <span className="text-sm text-gray-500">{email.time}</span>
                      </div>
                    </div>
                    <h4 className="font-semibold text-gray-900 mt-1">{email.subject}</h4>
                    <p className="text-gray-600 text-sm mt-1 line-clamp-2">{email.preview}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-gray-500">{email.date}</span>
                      {email.status && (
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(email.status)}
                          <span className="text-xs text-gray-500">{getStatusText(email.status)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Floating Action Button */}
      <Button
        onClick={() => setShowCompose(true)}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-primary hover:bg-primary/90 text-white shadow-lg"
      >
        <Plus className="w-5 h-5" />
      </Button>
    </div>
  );
}
