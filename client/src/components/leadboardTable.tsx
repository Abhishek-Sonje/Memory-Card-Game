"use client";
import { useState, useMemo } from "react";
import { Trophy, Medal, Award, SortAsc, X } from "lucide-react";
import ShinyText from "./ShinyText";
import { Button } from "@/components/UI/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/UI/dropdown-menu";

// type leaderboardType = InferSelectModel<typeof leaderboard>;
export default function Leaderboard({
  data,
}: {
  data: {
    id: number;
    userId: number;
    userName: string;
    totalGamesPlayed: number;
    totalWins: number;
    totalScore: number;
  }[];
}) {
  const [sortBy, setSortBy] = useState("score");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const sortedData = useMemo(() => {
    const sorted = [...data];
    if (sortBy === "wins") {
      sorted.sort((a, b) => b.totalWins - a.totalWins);
    } else if (sortBy === "games") {
      sorted.sort((a, b) => b.totalGamesPlayed - a.totalGamesPlayed);
    } else {
      sorted.sort((a, b) => b.totalScore - a.totalScore);
    }
    return sorted;
  }, [data, sortBy]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Award className="w-6 h-6 text-amber-700" />;
    return null;
  };

  const getRankBadge = (rank: number) => {
    const baseClasses =
      "flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg";
    if (rank === 1)
      return `${baseClasses} bg-gradient-to-br from-yellow-400 to-yellow-600 text-black shadow-lg`;
    if (rank === 2)
      return `${baseClasses} bg-gradient-to-br from-gray-400 to-gray-500 text-black shadow-lg`;
    if (rank === 3)
      return `${baseClasses} bg-gradient-to-br from-amber-600 to-amber-800 text-white shadow-lg`;
    return `${baseClasses} bg-gray-700 text-gray-300`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Trophy className="w-10 h-10 text-yellow-500 animate-pulse" />
            {/* <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight"> */}

            <ShinyText text="Leaderboard" className="text-7xl   " />
            <Trophy className="w-10 h-10 text-yellow-500 animate-pulse" />
          </div>
          <p className="text-gray-400 text-lg">
            Top players competing for the ultimate memory challenge
          </p>
        </div>

        {/* Leaderboard Card */}
        <div className="bg-gradient-to-tr from-neutral-900 via-black to-neutral-900 rounded-lg shadow-2xl overflow-hidden border border-gray-800">
          {/* Current Sort Indicator */}
          <div className="bg-gradient-to-rbg-gradient-to-br from-neutral-900 via-black to-neutral-900 px-6 py-3 border-b border-gray-800 flex items-center justify-between">
            <p className="text-gray-300 text-sm font-medium">
              Sorted by:{" "}
              {sortBy === "wins"
                ? "Most Wins"
                : sortBy === "games"
                ? "Games Played"
                : "Total Score"}
            </p>
            {/* Sort Button */}
            <div className=" ">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    
                    variant="outline"
                  >
                    Sort
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel>Sorting based on</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    value={sortBy}
                    onValueChange={setSortBy}
                  >
                    <DropdownMenuRadioItem value="scores">
                      Scores
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="wins">
                      Most Wins
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="games">
                      Games Played
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className=" bg-black">
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-300">
                    Rank
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-300">
                    Player
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-gray-300">
                    Games
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-gray-300">
                    Wins
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-300">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((entry, index) => {
                  const rank = index + 1;
                  const isTopThree = rank <= 3;

                  return (
                    <tr
                      key={entry.id}
                      className={`border-b border-gray-800 transition-all hover:bg-gray-800/50 ${
                        isTopThree ? "bg-gray-800/30" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={getRankBadge(rank)}>{rank}</div>
                          {getRankIcon(rank)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`font-semibold ${
                            isTopThree ? "text-white text-lg" : "text-gray-300"
                          }`}
                        >
                          {entry.userName || `Player ${entry.id}`}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-block bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-sm font-medium border border-gray-700">
                          {entry.totalGamesPlayed}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-block bg-gray-800 text-green-400 px-3 py-1 rounded-full text-sm font-medium border border-gray-700">
                          {entry.totalWins}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`font-bold ${
                            isTopThree
                              ? "text-xl text-white"
                              : "text-lg text-gray-300"
                          }`}
                        >
                          {entry.totalScore.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="bg-gradient-to-t from-neutral-900 via-black to-black px-6 py-4 text-center border-t border-gray-800">
            <p className="text-gray-400 text-sm font-medium">
              Keep playing to climb the ranks!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
