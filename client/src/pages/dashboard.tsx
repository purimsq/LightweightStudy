import { useQuery } from "@tanstack/react-query";
import ProgressCards from "@/components/dashboard/progress-cards";
import UnitCards from "@/components/dashboard/unit-cards";
import QuickActions from "@/components/dashboard/quick-actions";
import { Card, CardContent } from "@/components/ui/card";
import { History } from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: user } = useQuery({
    queryKey: ["/api/users/current"],
  });

  const { data: units = [] } = useQuery({
    queryKey: ["/api/units"],
  });

  return (
    <div className="p-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="gradient-card rounded-2xl p-8 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-3xl font-bold text-shimmer mb-2">
                  Hey, {user?.name || "Mitchell"}! 👋
                </h2>
                <p className="text-lg text-neutral-600">Ready for another productive study session?</p>
              </div>
              <div className="text-right">
                <div className="glass-card px-4 py-3 rounded-lg">
                  <div className="text-sm font-medium text-neutral-700">Today</div>
                  <div className="text-xs text-neutral-500">{format(new Date(), "EEEE, MMMM d, yyyy")}</div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 mt-4">
              <div className="w-2 h-2 bg-green-500 rounded-full pulse-dot"></div>
              <span className="text-sm text-neutral-600">All systems ready</span>
            </div>
          </div>
        </div>

        {/* Progress Cards */}
        <ProgressCards />

        {/* Your Units Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-neutral-800">Your Units</h3>
            <a 
              href="/units" 
              className="text-sm text-primary hover:text-primary/80 transition-colors duration-200"
            >
              View all units
            </a>
          </div>
          <UnitCards units={units.slice(0, 3)} />
        </div>

        {/* Recent Activity */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-neutral-800 mb-6">Recent Activity</h3>
          <div className="floating-card rounded-2xl p-8">
            <div className="text-center">
              <div className="glass-card w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
                <History className="h-8 w-8 text-neutral-400" />
              </div>
              <p className="text-neutral-600 font-medium">No recent activity yet</p>
              <p className="text-sm text-neutral-500 mt-2">
                Start studying to see your progress here!
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <QuickActions />
      </div>
    </div>
  );
}
