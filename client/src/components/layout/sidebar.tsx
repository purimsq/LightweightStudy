import { useLocation } from "wouter";
import { Slider } from "@/components/ui/slider";
import { Book, Home, Folder, ClipboardList, Calendar, Bot } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Units", href: "/units", icon: Folder },
  { name: "Assignments & CATs", href: "/assignments", icon: ClipboardList },
  { name: "Daily Study Plan", href: "/study-plan", icon: Calendar },
  { name: "AI Chat", href: "/ai-chat", icon: Bot },
];

export default function Sidebar() {
  const [location, navigate] = useLocation();
  
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

  return (
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
        <div className="text-sm text-neutral-600">
          <span>Hey, {user?.name || "Mitchell"}! 👋</span>
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

      {/* Learning Pace Slider */}
      <div className="p-4 border-t border-neutral-200">
        <label className="block text-sm font-medium text-neutral-600 mb-2">
          Learning Pace
        </label>
        <div className="space-y-2">
          <Slider
            value={[user?.learningPace || 45]}
            onValueChange={handlePaceChange}
            max={80}
            min={1}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-neutral-600">
            <span>Slow</span>
            <span>{user?.learningPace || 45}</span>
            <span>Fast</span>
          </div>
        </div>
      </div>
    </div>
  );
}
