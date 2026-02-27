import Image from "next/image";
import { WaitlistDialog } from "@/components/waitlist-dialog";

export function Navbar() {
  return (
    <nav className="flex h-20 items-center justify-between px-[10%]">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-black p-1">
          <Image src="/logo-white.svg" height={30} width={30} alt="logo" />
        </div>
        <h1 className="text-xl font-bold">Qaktus</h1>
      </div>
      <WaitlistDialog />
    </nav>
  );
}
