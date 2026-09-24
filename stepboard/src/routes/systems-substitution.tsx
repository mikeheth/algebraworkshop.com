import { createFileRoute } from "@tanstack/react-router";
import { SystemsApp } from "@/components/solver/systems-app";
import { PlusPreview } from "@/components/workshop/plus-preview";

export const Route = createFileRoute("/systems-substitution")({
  component: SubstitutionPage,
});

function SubstitutionPage() {
  return (
    <PlusPreview
      title="Substitution method"
      lede="This board is part of Algebra Workshop Plus. Billing is not open yet. You can preview it while we finish."
      points={[
        "Easy: a letter is a number, or one step from a number",
        "Medium: replace a letter with an expression — parentheses first",
        "Advanced: isolate the expression, then replace it",
        "Then finish like Stepboard and check the pair",
      ]}
    >
      <SystemsApp method="substitution" />
    </PlusPreview>
  );
}
