import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";

export default function TopBar() {
  const today = new Date();
  const { data: user } = useQuery({
    queryKey: ["/api/users/current"],
  });

  return (
    <div>
      <header className="bg-white border-b border-neutral-200 px-6 py-6">
        <div className="flex items-start justify-between">
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
