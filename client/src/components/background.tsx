// "use client";
import { cn } from "@/lib/utils";
import { DottedSurface } from "./UI/dotted-surface";
import AnimatedModalDemo from "./CreateRoom";
import JoinRoomModal from "./JoinRoom";

export default function Background() {
  return (
    // ensure visible area — use h-screen for testing
    <div className="w-full h-screen">
      <div className="absolute inset-0 flex items-center justify-center">
        <DottedSurface className="size-full">
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute -top-10 left-1/2 size-full -translate-x-1/2 rounded-full",
              "bg-[radial-gradient(ellipse_at_center,--theme(--color-foreground/.1),transparent_10%)]",
              "blur-[30px]"
            )}
            />
             
        </DottedSurface>
      </div>
      <div className="flex justify-center items-center h-full gap-14">
        <AnimatedModalDemo />
        <JoinRoomModal />
      </div>
      {/* <div className="absolute inset-0 flex justify-center gap-14  "></div> */}
    </div>
  );
}
