"use client";

import { Check, Copy, Menu, Users, X } from "lucide-react";

type props={
    roomCode:string;
    copied:boolean;
    onCopy:()=>void;
    playersCount:number;
    onToggleDrawer:()=>void;
    isDrawerOpen:boolean;
}

function Header({
  roomCode,
    copied,
    onCopy,
  playersCount,
onToggleDrawer,
  isDrawerOpen,
}: props) {
  return (
    <header className="p-4 border border-[#23f9b23f] mx-3 mt-3 rounded-4xl backdrop-blur-2xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold  text-white">Memique</h1>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#0B1F1A] rounded-lg border border-gray-700">
            <span className="text-gray-400 text-sm">Room:</span>
            <span className="text-white font-mono font-semibold">
              {roomCode}
            </span>
            <button
              onClick={onCopy}
              className="ml-1 p-1 hover:bg-gray-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400"
              aria-label="Copy room code"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        <button
          onClick={onToggleDrawer}
          className="lg:hidden p-2 hover:bg-gray-800 rounded-lg transition-colors text-white"
          aria-label="Toggle menu"
        >
          {isDrawerOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>

        <div className="hidden lg:flex items-center gap-3">
          <Users className="w-5 h-5 text-gray-400" />
          <span className="text-white">
            {playersCount} Player{playersCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </header>
  );
}

export default Header;
