import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";

export default function TopBar() {
  const today = new Date();
  const { data: user } = useQuery({
    queryKey: ["/api/users/current"],
  });

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
