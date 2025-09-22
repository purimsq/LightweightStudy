import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import ProgressCards from "@/components/dashboard/progress-cards";
import UnitCards from "@/components/dashboard/unit-cards";
import QuickActions from "@/components/dashboard/quick-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History, TestTube } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardStore } from "@/stores/pageStateStore";

export default function Dashboard() {
  const { user } = useAuth();

  // Use Zustand store for persistent state
  const { counter, setCounter } = useDashboardStore();

  // Debug log to see if component is mounting/unmounting
  console.log('🏠 Dashboard component rendered, counter:', counter);
  
  const { data: userData } = useQuery({
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
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-neutral-800">
              Hey, {user?.name || "User"}! 👋
            </h2>
            <div className="text-sm text-neutral-600">
              <div className="text-right">
                <div className="font-medium">Today</div>
                <div>{format(new Date(), "EEEE, MMMM d, yyyy")}</div>
              </div>
            </div>
          </div>
          <p className="text-neutral-600">Ready for another productive study session?</p>
        </div>

        {/* Page State Test Section */}
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <TestTube className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-800">Page State Test</h3>
            </div>
            <p className="text-sm text-blue-700 mb-3">
              This counter persists across page navigation! Try clicking it, then navigate to another page and come back.
            </p>
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => setCounter(c => c + 1)}
                size="sm"
                variant="outline"
              >
                Count: {counter}
              </Button>
              <Button 
                onClick={() => setCounter(0)}
                size="sm"
                variant="outline"
              >
                Reset
              </Button>
              <Button
                onClick={() => {
                  console.log('🧪 Manual test - current counter:', counter);
                  console.log('🧪 Manual test - localStorage value:', localStorage.getItem('dashboard-counter'));
                }}
                size="sm"
                variant="outline"
              >
                Test
              </Button>
              <span className="text-xs text-blue-600">
                {counter > 0 ? '✅ State restored' : '🔄 Fresh state'}
              </span>
            </div>
          </CardContent>
        </Card>

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
