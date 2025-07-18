import { useLocation } from "wouter";
import { Plus, Upload, ClipboardPlus, MessageSquare } from "lucide-react";

const quickActions = [
  {
    title: "Add Unit",
    description: "Create new study unit",
    icon: Plus,
    href: "/units",
    color: "bg-primary/20 text-primary group-hover:bg-primary/30",
  },
  {
    title: "Upload Document", 
    description: "Add PDF or DOCX",
    icon: Upload,
    href: "/upload",
    color: "bg-accent/20 text-accent group-hover:bg-accent/30",
  },
  {
    title: "New Assignment",
    description: "Create assignment or CAT",
    icon: ClipboardPlus,
    href: "/assignments",
    color: "bg-green-500/20 text-green-600 group-hover:bg-green-500/30",
  },
  {
    title: "Ask AI",
    description: "Get study help",
    icon: MessageSquare,
    href: "/ai-chat",
    color: "bg-purple-500/20 text-purple-600 group-hover:bg-purple-500/30",
  },
];

export default function QuickActions() {
  const [, navigate] = useLocation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {quickActions.map((action) => {
        const Icon = action.icon;
        
        return (
          <button
            key={action.title}
            onClick={() => navigate(action.href)}
            className="quick-action-card"
          >
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${action.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-medium text-warm-gray">{action.title}</h4>
                <p className="text-sm text-neutral-600">{action.description}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
