import { createFileRoute } from "@tanstack/react-router";
import { StepboardApp } from "@/components/solver/stepboard-app";

export const Route = createFileRoute("/stepboard")({ component: StepboardPage });

function StepboardPage() {
  return <StepboardApp board="equations" />;
}
