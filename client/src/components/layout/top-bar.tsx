import { format } from "date-fns";

export default function TopBar() {
  const today = new Date();

  return (
    <header className="bg-white border-b border-neutral-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          {/* Motivational Quote */}
          <div className="text-center mb-4">
            <blockquote className="text-lg font-medium text-warm-gray italic">
              "Discipline is choosing between what you want and what you want most"
            </blockquote>
            <p className="text-sm text-neutral-600 mt-1">
              When you lack motivation you can always choose discipline
            </p>
          </div>
        </div>
        <div className="text-sm text-neutral-600">
          <div className="text-right">
            <div className="font-medium">Today</div>
            <div>{format(today, "EEEE, MMMM d, yyyy")}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
