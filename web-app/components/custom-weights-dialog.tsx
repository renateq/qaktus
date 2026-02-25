"use client";

import { Fragment, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoaderCircle, Zap } from "lucide-react";

interface CustomWeightsDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  urls: string[];
  onGenerate(weights: number[]): void;
  isGenerating: boolean;
}

export function CustomWeightsDialog({
  open,
  onOpenChange,
  urls,
  onGenerate,
  isGenerating,
}: CustomWeightsDialogProps) {
  const [weights, setWeights] = useState<number[]>([]);

  // Derive effective weights at render time: pad with 1 for new URLs, trim extras
  const effectiveWeights = urls.map((_, i) => weights[i] ?? 1);

  const total = effectiveWeights.reduce((sum, w) => sum + (Number(w) || 0), 0);
  const pct = (w: number) => (total === 0 ? 0 : Math.round((w / total) * 100));

  function handleGenerate() {
    onGenerate(effectiveWeights.map(Number));
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Custom weights</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 gap-y-2">
          <span className="text-muted-foreground text-xs font-medium uppercase">
            URL
          </span>
          <span className="text-muted-foreground text-xs font-medium uppercase">
            Weight
          </span>
          <span className="text-muted-foreground text-xs font-medium uppercase">
            Traffic
          </span>
          {urls.map((url, i) => (
            <Fragment key={i}>
              <span className="truncate font-mono text-sm" title={url}>
                {url}
              </span>
              <Input
                type="number"
                min="1"
                className="w-20"
                value={effectiveWeights[i]}
                onChange={(e) =>
                  setWeights(() => {
                    const next = [...effectiveWeights];
                    next[i] = Number(e.target.value);
                    return next;
                  })
                }
              />
              <span className="text-muted-foreground w-16 text-right text-sm">
                {pct(effectiveWeights[i])}%
              </span>
            </Fragment>
          ))}
        </div>
        <DialogFooter>
          <Button
            className="mt-4"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            Generate Short Link{" "}
            {isGenerating ? <LoaderCircle className="animate-spin" /> : <Zap />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
