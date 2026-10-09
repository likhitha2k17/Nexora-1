import { useState } from "react";
import { toast } from "sonner";
import { Ban, BadgeCheck, Flag, FolderPlus, FolderInput } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import type { Finding } from "@/lib/types";
import { AddToCaseDialog, CreateCaseDialog, DismissDialog } from "./case-dialogs";

export function FindingActions({ finding }: { finding: Finding }) {
  const { setFindingStatus, state } = useStore();
  const [dismiss, setDismiss] = useState(false);
  const [add, setAdd] = useState(false);
  const [create, setCreate] = useState(false);
  const linkedCases = state.cases.filter((c) => c.findingIds.includes(finding.id));
  const official = finding.status === "Official";

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        <Button
          variant="outline"
          disabled={official || finding.status === "Marked for review"}
          onClick={() => { setFindingStatus(finding.id, "Marked for review"); toast.success("Marked for review"); }}
        >
          <Flag /> Mark for review
        </Button>
        <Button
          variant="outline"
          disabled={official || finding.status === "Authorized"}
          onClick={() => { setFindingStatus(finding.id, "Authorized", "Marked as authorized by reviewer"); toast.success("Marked as authorized"); }}
        >
          <BadgeCheck /> Mark as authorized
        </Button>
        <Button variant="outline" disabled={official || finding.status === "Dismissed"} onClick={() => setDismiss(true)}>
          <Ban /> Dismiss with reason
        </Button>
        <Button variant="outline" disabled={official} onClick={() => setAdd(true)}>
          <FolderInput /> Add to existing case
        </Button>
      </div>
      <Button className="w-full" disabled={official} onClick={() => setCreate(true)}>
        <FolderPlus /> Create case
      </Button>
      {official && <p className="text-xs text-muted-foreground">This is a registered official asset; review actions are disabled.</p>}
      {finding.statusReason && <p className="text-xs text-muted-foreground">Status note: {finding.statusReason}</p>}
      {linkedCases.length > 0 && (
        <p className="text-xs text-muted-foreground">Linked to: {linkedCases.map((c) => c.id).join(", ")}</p>
      )}
      <DismissDialog open={dismiss} onOpenChange={setDismiss} onConfirm={(r) => { setFindingStatus(finding.id, "Dismissed", r); toast("Finding dismissed", { description: r }); }} />
      <AddToCaseDialog open={add} onOpenChange={setAdd} findingIds={[finding.id]} />
      <CreateCaseDialog open={create} onOpenChange={setCreate} findingIds={[finding.id]} />
    </div>
  );
}
