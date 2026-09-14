import { createFileRoute } from "@tanstack/react-router";
import { WorkshopHome } from "@/components/workshop/home";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <WorkshopHome />;
}
