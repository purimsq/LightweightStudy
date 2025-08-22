import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";

export default function TopBar() {
  const today = new Date();
  const [location, setLocation] = useLocation();
  const [isAnimating, setIsAnimating] = useState(false);
  const { data: user } = useQuery({
    queryKey: ["/api/users/current"],
  });

  // Only show header on dashboard page (both root and dashboard paths)
  if (location !== "/dashboard" && location !== "/") {
    return null;
  }

  const handleProfileClick = () => {
    setIsAnimating(true);
    
    // First animation - scale and fade
    setTimeout(() => {
      // Second animation - slide transition
      setTimeout(() => {
        setLocation("/progress");
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
          <div className="absolute top-4 right-6 w-12 h-12 bg-gray-100 rounded-full animate-ping" />
          
          {/* Second animation - sliding curtain */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-100 to-gray-200 transform translate-x-full animate-slideIn" />
        </div>
      )}
      
      <div className="bg-gradient-to-br from-teal-50 to-blue-50 border-b border-neutral-200 shadow-sm">
        <header className="max-w-6xl mx-auto px-6 py-4 relative">
          <div className="text-center py-2">
            {/* Centered Motivational Quote */}
            <blockquote className="text-xl font-bold text-neutral-800 italic">
              "Discipline is choosing between what you want now and what you want most"
            </blockquote>
            <p className="text-base text-neutral-600 mt-1">
              When you lack motivation you can always choose discipline
            </p>
          </div>
          

          
          {/* By MyLo in orange - positioned at bottom right */}
          <div className="absolute bottom-2 right-6 text-xs font-medium text-orange-500">
            by MyLo
          </div>
        </header>
      </div>

    </>
  );
}
