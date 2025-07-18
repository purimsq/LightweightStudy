import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface FloatingActionButtonProps {
  onClick: () => void;
}

export default function FloatingActionButton({ onClick }: FloatingActionButtonProps) {
  return (
    <Button
      onClick={onClick}
      className="floating-action"
      size="icon"
    >
      <Plus className="text-xl group-hover:rotate-90 transition-transform duration-200" />
    </Button>
  );
}
