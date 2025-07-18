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
    <div>
      <header className="bg-white border-b border-neutral-200 px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Clean spacer */}
          <div className="flex-1"></div>
          {/* By MyLo in orange */}
          <div className="text-xs font-medium text-orange-500">
            by MyLo
          </div>
        </div>
      </header>
    </div>
  );
}
