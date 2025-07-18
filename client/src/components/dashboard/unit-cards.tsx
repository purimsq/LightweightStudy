import { Progress } from "@/components/ui/progress";
import { useLocation } from "wouter";
import type { Unit } from "@shared/schema";

const iconMap = {
  "user-md": "👨‍⚕️",
  "shield-alt": "🛡️",
  "heartbeat": "💓",
  "brain": "🧠",
  "dna": "🧬",
  "microscope": "🔬",
  "pills": "💊",
  "stethoscope": "🩺",
  "folder": "📁",
};

const colorMap = {
  blue: "bg-blue-100 text-blue-600",
  green: "bg-green-100 text-green-600", 
  yellow: "bg-yellow-100 text-yellow-600",
  purple: "bg-purple-100 text-purple-600",
  red: "bg-red-100 text-red-600",
  orange: "bg-orange-100 text-orange-600",
  pink: "bg-pink-100 text-pink-600",
  indigo: "bg-indigo-100 text-indigo-600",
};

interface UnitCardsProps {
  units: Unit[];
}

export default function UnitCards({ units }: UnitCardsProps) {
  const [, navigate] = useLocation();

  const handleUnitClick = (unitId: number) => {
    navigate(`/units?selected=${unitId}`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {units.map((unit) => {
        const progressPercentage = unit.totalTopics > 0 
          ? Math.round((unit.completedTopics / unit.totalTopics) * 100) 
          : 0;

        const colorClass = colorMap[unit.color as keyof typeof colorMap] || colorMap.blue;
        const icon = iconMap[unit.icon as keyof typeof iconMap] || "📁";

        return (
          <div
            key={unit.id}
            className="unit-card"
            onClick={() => handleUnitClick(unit.id)}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${colorClass}`}>
                  {icon}
                </div>
                <div>
                  <h4 className="font-semibold text-neutral-800">{unit.name}</h4>
                  <p className="text-sm text-neutral-600">{unit.description}</p>
                </div>
              </div>
            </div>
            <div className="mb-3">
              <div className="flex items-center justify-between text-sm text-neutral-600 mb-1">
                <span>Progress</span>
                <span>{unit.completedTopics} of {unit.totalTopics} topics</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
