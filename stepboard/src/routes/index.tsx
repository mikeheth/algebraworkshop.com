import { createFileRoute } from "@tanstack/react-router";
import { StepboardApp } from "@/components/solver/stepboard-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <StepboardApp />;
}
