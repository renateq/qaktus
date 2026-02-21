"use client";

import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { CirclePlus, Link, X, Zap } from "lucide-react";
import { useState } from "react";

export default function Home() {
  const [urls, setUrls] = useState<string[]>([""]);
  return (
    <main className="min-h-[calc(100vh-5rem)] bg-blue-100">
      <p className="text-center text-3xl font-bold">
        One link, multiple destinations.
      </p>
      <p className="mx-auto max-w-xl text-center opacity-70">
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam
        deserunt excepturi nesciunt consequuntur nisi nihil illum quod explicabo
        numquam et, amet corrupti labore veritatis alias dolore aliquid earum
        delectus mollitia!
      </p>
      <div className="mx-auto max-w-lg bg-red-100">
        <div className="flex flex-col gap-3">
          {urls.map((url, i) => (
            <InputGroup key={i}>
              <InputGroupAddon>
                <Link />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="Enter URL"
                value={url}
                onChange={(e) =>
                  setUrls((current) => {
                    const next = [...current];
                    next[i] = e.target.value;
                    return next;
                  })
                }
              />
              {urls.length > 1 && (
                <InputGroupAddon align="inline-end">
                  <Button
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() =>
                      setUrls((current) =>
                        current.filter((_, idx) => idx !== i),
                      )
                    }
                  >
                    <X />
                  </Button>
                </InputGroupAddon>
              )}
            </InputGroup>
          ))}
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setUrls((current) => [...current, ""])}
        >
          <CirclePlus /> Add another destination
        </Button>
        <Button className="mt-10 h-10 w-full text-lg">
          Generate Short Link <Zap />
        </Button>
      </div>
    </main>
  );
}
