import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

export default function TopBar() {
  const today = new Date();
  const [location] = useLocation();
  const { data: user } = useQuery({
    queryKey: ["/api/users/current"],
  });

  // Only show header on dashboard page
  if (location !== "/dashboard") {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-teal-50 to-blue-50 border-b border-neutral-200 shadow-sm">
      <header className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col items-center relative min-h-[160px]">
          {/* Centered Motivational Quote */}
          <div className="flex-1 text-center">
            <blockquote className="text-2xl font-bold text-neutral-800 italic">
              "Discipline is choosing between what you want and what you want most"
            </blockquote>
            <p className="text-lg text-neutral-600 mt-2">
              When you lack motivation you can always choose discipline
            </p>
          </div>
          {/* By MyLo in orange - positioned at bottom */}
          <div className="text-xs font-medium text-orange-500 mt-16">
            by MyLo
          </div>
        </div>
      </header>
    </div>
  );
}
