import { createFileRoute } from "@tanstack/react-router";
import { SystemsApp } from "@/components/solver/systems-app";
import { PlusPreview } from "@/components/workshop/plus-preview";

export const Route = createFileRoute("/systems-elimination")({
  component: EliminationPage,
});

function EliminationPage() {
  return (
    <PlusPreview
      title="Elimination method"
      lede="This board is part of Algebra Workshop Plus. Billing is not open yet. You can preview it while we finish."
      points={[
        "Two equations, two unknowns",
        "Add or subtract so one column cancels",
        "Multiply one equation first when the coefficients do not match",
        "Then find the other letter and check the pair",
      ]}
    >
      <SystemsApp method="elimination" />
    </PlusPreview>
  );
}
