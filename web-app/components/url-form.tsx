"use client";

import { Button } from "@/components/ui/button";
import { CirclePlus, LoaderCircle, Zap } from "lucide-react";
import { UrlInputRow } from "./url-input-row";

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
  onGenerate(): void;
  isGenerating: boolean;
}

export function UrlForm({
  urls,
  onUrlChange,
  onAddUrl,
  onRemoveUrl,
  onGenerate,
  isGenerating,
}: UrlFormProps) {
  const allValid = urls.every(isValidUrl);

  return (
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
      <Button
        disabled={!allValid || isGenerating}
        className="mt-10 h-10 w-full text-lg"
        onClick={onGenerate}
      >
        Generate Short Link{" "}
        {isGenerating ? (
          <LoaderCircle className="animate-spin" />
        ) : (
          <Zap />
        )}
      </Button>
    </div>
  );
}
