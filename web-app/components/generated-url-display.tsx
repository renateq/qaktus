"use client";

import { Button } from "@/components/ui/button";
import { Item } from "@/components/ui/item";
import { Clipboard, ClipboardCheck } from "lucide-react";

interface GeneratedUrlDisplayProps {
  shortUrl: string;
  isCopied: boolean;
  onCopy(): void;
  onReset(): void;
}

export function GeneratedUrlDisplay({
  shortUrl,
  isCopied,
  onCopy,
  onReset,
}: GeneratedUrlDisplayProps) {
  return (
    <>
      <Item variant="muted" className="mt-10 justify-between">
        <p className="text-lg">{shortUrl}</p>
        <Button variant="ghost" className="h-10" onClick={onCopy}>
          {isCopied ? <ClipboardCheck /> : <Clipboard />}
          {isCopied ? "Copied" : "Copy"}
        </Button>
      </Item>
      <div className="mt-10 flex justify-center">
        <Button variant="ghost" onClick={onReset}>
          Generate a new link
        </Button>
      </div>
    </>
  );
}
