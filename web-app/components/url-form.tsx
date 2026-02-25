"use client";

import { Button } from "@/components/ui/button";
import {
  CirclePlus,
  LoaderCircle,
  Pencil,
  Square,
  SquareCheck,
  Zap,
} from "lucide-react";
import { UrlInputRow } from "./url-input-row";
import { useState } from "react";
import { CustomWeightsDialog } from "./custom-weights-dialog";
import { Toggle } from "./ui/toggle";

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

interface UrlFormProps {
  urls: string[];
  onUrlChange(index: number, value: string): void;
  onAddUrl(): void;
  onRemoveUrl(index: number): void;
  onGenerate(weights?: number[]): void;
  setIsUsingCustomWeights(isUsingCustomWeights: boolean): void;
  isGenerating: boolean;
  isUsingCustomWeights: boolean;
}

export function UrlForm({
  urls,
  onUrlChange,
  onAddUrl,
  onRemoveUrl,
  onGenerate,
  setIsUsingCustomWeights,
  isGenerating,
  isUsingCustomWeights,
}: UrlFormProps) {
  const [showCustomWeightsDialog, setShowCustomWeightsDialog] = useState(false);

  const allValid = urls.every(isValidUrl);

  return (
    <>
      <div className="flex flex-col gap-3">
        {urls.map((url, i) => (
          <UrlInputRow
            key={i}
            value={url}
            onChange={(value) => onUrlChange(i, value)}
            onRemove={urls.length > 1 ? () => onRemoveUrl(i) : undefined}
          />
        ))}
        <Button variant="outline" className="w-full" onClick={onAddUrl}>
          <CirclePlus /> Add another destination
        </Button>
        <Toggle
          className="mt-10 w-fit px-4"
          aria-label="Toggle bookmark"
          size="sm"
          pressed={isUsingCustomWeights}
          onPressedChange={(newValue) => setIsUsingCustomWeights(newValue)}
        >
          {isUsingCustomWeights ? <SquareCheck /> : <Square />}
          Use custom weights
        </Toggle>
        {isUsingCustomWeights ? (
          <Button
            disabled={!allValid || isGenerating}
            className="h-10 w-full text-lg"
            onClick={() => setShowCustomWeightsDialog(true)}
          >
            Set Custom Weights <Pencil />
          </Button>
        ) : (
          <Button
            disabled={!allValid || isGenerating}
            className="h-10 w-full text-lg"
            onClick={() => onGenerate()}
          >
            Generate Short Link{" "}
            {isGenerating ? <LoaderCircle className="animate-spin" /> : <Zap />}
          </Button>
        )}
      </div>
      <CustomWeightsDialog
        open={showCustomWeightsDialog}
        onOpenChange={setShowCustomWeightsDialog}
        urls={urls}
        onGenerate={onGenerate}
        isGenerating={isGenerating}
      />
    </>
  );
}
