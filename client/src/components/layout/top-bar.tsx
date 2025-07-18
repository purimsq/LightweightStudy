import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";

export default function TopBar() {
  const today = new Date();
  const { data: user } = useQuery({
    queryKey: ["/api/users/current"],
  });

  return null;
}
