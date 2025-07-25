import { useLocation } from "wouter";
import { Slider } from "@/components/ui/slider";
import { Book, Home, Folder, ClipboardList, Calendar, Bot, Music, SkipBack, SkipForward, Pause } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Units", href: "/units", icon: Folder },
  { name: "Assignments & CATs", href: "/assignments", icon: ClipboardList },
  { name: "Daily Study Plan", href: "/study-plan", icon: Calendar },
  { name: "AI Chat", href: "/ai-chat", icon: Bot },
];

export default function Sidebar() {
  const [location, navigate] = useLocation();
  const [isAnimating, setIsAnimating] = useState(false);
  
  const { data: user } = useQuery({
    queryKey: ["/api/users/current"],
  });

  const updatePaceMutation = useMutation({
    mutationFn: async (pace: number) => {
      if (!user) return;
      const response = await apiRequest("PATCH", `/api/users/${user.id}`, {
        learningPace: pace,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/current"] });
    },
  });

  const handlePaceChange = (value: number[]) => {
    updatePaceMutation.mutate(value[0]);
  };

  const handleProfileClick = () => {
    setIsAnimating(true);
    
    // First animation - scale and fade
    setTimeout(() => {
      // Second animation - slide transition
      setTimeout(() => {
        navigate("/progress");
        setIsAnimating(false);
      }, 300);
    }, 300);
  };

  return (
    <>
      {/* Transition overlay */}
      {isAnimating && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          {/* First animation - expanding circle */}
          <div className="absolute bottom-20 left-32 w-12 h-12 bg-gray-100 rounded-full animate-ping" />
          
          {/* Second animation - sliding curtain */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-100 to-gray-200 transform translate-x-full animate-slideIn" />
        </div>
      )}
      
      <div className="w-64 bg-cream border-r border-neutral-200 flex flex-col">
      {/* Logo and User Greeting */}
      <div className="p-6 border-b border-neutral-200">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Book className="text-white text-sm" />
          </div>
          <div>
            <h1 className="font-semibold text-neutral-800 text-lg">StudyCompanion</h1>
            <p className="text-xs text-neutral-600">Lightweight</p>
          </div>
        </div>
        <div className="space-y-2">
          <button
            onClick={() => {
              // Store current page before navigating to music
              localStorage.setItem('previousPage', window.location.pathname);
              navigate("/music");
            }}
            className="flex items-center space-x-3 hover:bg-gray-50 rounded-lg p-2 transition-all duration-200 group w-full"
          >
            <span className="text-lg font-semibold text-neutral-800 group-hover:text-purple-600">LuvNoir</span>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Music className="w-4 h-4 text-white" />
              </div>
              {/* Animated Equalizer Bars - moved to right side */}
              <div className="flex items-end space-x-0.5 h-4">
                <div className="w-0.5 bg-purple-500 rounded-full animate-pulse" style={{ height: '60%', animationDelay: '0ms', animationDuration: '800ms' }}></div>
                <div className="w-0.5 bg-pink-500 rounded-full animate-pulse" style={{ height: '80%', animationDelay: '200ms', animationDuration: '800ms' }}></div>
                <div className="w-0.5 bg-purple-500 rounded-full animate-pulse" style={{ height: '40%', animationDelay: '400ms', animationDuration: '800ms' }}></div>
                <div className="w-0.5 bg-pink-500 rounded-full animate-pulse" style={{ height: '90%', animationDelay: '600ms', animationDuration: '800ms' }}></div>
              </div>
            </div>
          </button>
          
          {/* Mini Music Controls - shown when music is playing */}
          <div className="flex items-center justify-center space-x-2 px-2">
            <button className="w-6 h-6 rounded-full bg-purple-100 hover:bg-purple-200 flex items-center justify-center transition-colors">
              <SkipBack className="w-3 h-3 text-purple-600" />
            </button>
            <button className="w-7 h-7 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 flex items-center justify-center transition-all">
              <Pause className="w-3.5 h-3.5 text-white" />
            </button>
            <button className="w-6 h-6 rounded-full bg-purple-100 hover:bg-purple-200 flex items-center justify-center transition-colors">
              <SkipForward className="w-3 h-3 text-purple-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4">
        <ul className="space-y-6">
          {navigation.map((item) => {
            const isActive = location === item.href || (item.href === "/dashboard" && location === "/");
            const Icon = item.icon;
            
            return (
              <li key={item.name}>
                <button
                  onClick={() => navigate(item.href)}
                  className={`sidebar-nav-item w-full ${isActive ? "active" : ""}`}
                >
                  <Icon className="text-sm w-4 h-4" />
                  <span className="font-medium">{item.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Profile Section */}
      <div className="p-4 border-t border-neutral-200">
        <button
          onClick={handleProfileClick}
          className="w-full flex items-center space-x-3 hover:bg-gray-50 rounded-lg p-3 transition-all duration-200 group"
        >
          {/* Profile Circle */}
          <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center text-white font-medium text-lg group-hover:bg-gray-500 transition-colors">
            M
          </div>
          
          {/* Profile Info */}
          <div className="text-left text-gray-600">
            <div className="font-medium text-sm">Mitchell</div>
            <div className="text-xs">study mode</div>
          </div>
        </button>
      </div>
    </div>
    </>
  );
}
