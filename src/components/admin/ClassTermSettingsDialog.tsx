import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar } from "lucide-react";

interface ClassTermSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  className: string;
}

export const ClassTermSettingsDialog = ({
  open,
  onOpenChange,
  classId,
  className,
}: ClassTermSettingsDialogProps) => {
  const [termEndedOn, setTermEndedOn] = useState("");
  const [nextTermBegins, setNextTermBegins] = useState("");
  const [generalRequirements, setGeneralRequirements] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && classId) {
      fetchClassSettings();
    }
  }, [open, classId]);

  const fetchClassSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("classes")
        .select("term_ended_on, next_term_begins, general_requirements")
        .eq("id", classId)
        .single();

      if (error) throw error;

      if (data) {
        setTermEndedOn(data.term_ended_on || "");
        setNextTermBegins(data.next_term_begins || "");
        setGeneralRequirements(data.general_requirements || "");
      }
    } catch (error) {
      console.error("Error fetching class settings:", error);
      toast.error("Failed to load class settings");
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("classes")
        .update({
          term_ended_on: termEndedOn || null,
          next_term_begins: nextTermBegins || null,
          general_requirements: generalRequirements || null,
        })
        .eq("id", classId);

      if (error) throw error;

      toast.success("Class term settings updated successfully");
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating class settings:", error);
      toast.error("Failed to update class settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Term Settings - {className}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="termEndedOn">Term End Date</Label>
              <Input
                id="termEndedOn"
                type="date"
                value={termEndedOn}
                onChange={(e) => setTermEndedOn(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nextTermBegins">Next Term Begins</Label>
              <Input
                id="nextTermBegins"
                type="date"
                value={nextTermBegins}
                onChange={(e) => setNextTermBegins(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="generalRequirements">General Requirements</Label>
            <Textarea
              id="generalRequirements"
              value={generalRequirements}
              onChange={(e) => setGeneralRequirements(e.target.value)}
              placeholder="Enter general requirements for all students in this class..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
