"use client";

import { Button } from "@/components/ui/button";
import { Item } from "@/components/ui/item";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
      <Item
        variant="muted"
        className="mt-10 flex-nowrap items-center justify-between"
      >
        <ScrollArea className="max-w-[calc(100%-7rem)] flex-1">
          <p className="text-base whitespace-nowrap lg:text-lg">{shortUrl}</p>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <Button variant="ghost" className="h-10 w-24 shrink-0" onClick={onCopy}>
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
