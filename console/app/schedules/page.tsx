import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function SchedulesPage() {
  return (
    <div>
      <PageHeader
        title="Schedules"
        description="Self-service recurrence — multiple schedules per workflow."
      />
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          The recurrence editor lands in Phase 4. Schedules are attached per workflow version;
          open a workflow to manage its schedules.
        </CardContent>
      </Card>
    </div>
  );
}
