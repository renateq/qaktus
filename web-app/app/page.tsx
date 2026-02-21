"use client";

import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Item } from "@/components/ui/item";
import {
  CirclePlus,
  Clipboard,
  Link,
  LoaderCircle,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";

enum State {
  generate,
  generating,
  generated,
}

export default function Home() {
  const [state, setState] = useState(State.generate);
  const [urls, setUrls] = useState<string[]>([""]);
  const [shortCode, setShortCode] = useState("");

  function generateShortLink() {
    setState(State.generating);
    // TODO: Send a request

    setUrls([""]);
    setShortCode("aD2f3");
    setState(State.generated);
  }

  return (
    <main className="min-h-[calc(100vh-5rem)] pt-20">
      <p className="text-center text-3xl font-bold">
        One link, multiple destinations.
      </p>
      <p className="mx-auto mt-5 max-w-xl text-center opacity-70">
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam
        deserunt excepturi nesciunt consequuntur nisi nihil illum quod explicabo
        numquam et, amet corrupti labore veritatis alias dolore aliquid earum
        delectus mollitia!
      </p>
      <div className="mx-auto mt-20 max-w-sm">
        {state != State.generated ? (
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
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setUrls((current) => [...current, ""])}
            >
              <CirclePlus /> Add another destination
            </Button>
            <Button
              disabled={urls.includes("") || state === State.generating}
              className="mt-10 h-10 w-full text-lg"
              onClick={generateShortLink}
            >
              Generate Short Link{" "}
              {state === State.generate ? (
                <Zap />
              ) : (
                <LoaderCircle className="animate-spin" />
              )}
            </Button>
          </div>
        ) : (
          <>
            <Item variant="muted" className="mt-10 justify-between">
              <p className="text-lg">https://qaktus.com/{shortCode}</p>
              <Button variant="ghost" className="h-10">
                <Clipboard className="text-xl" size={30} />
                Copy
              </Button>
            </Item>
            <div className="mt-10 flex justify-center">
              <Button
                variant="ghost"
                onClick={() => {
                  setUrls([""]);
                  setState(State.generate);
                }}
              >
                Generate a new link
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
