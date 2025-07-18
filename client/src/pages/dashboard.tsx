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
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-neutral-800 mb-2">
            Hey, {user?.name || "Mitchell"}! 👋
          </h2>
          <p className="text-neutral-600">Ready for another productive study session?</p>
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
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <History className="mx-auto h-12 w-12 text-neutral-400 mb-4" />
                <p className="text-neutral-600">No recent activity yet</p>
                <p className="text-sm text-neutral-500 mt-1">
                  Start studying to see your progress here!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <QuickActions />
      </div>
    </div>
  );
}
