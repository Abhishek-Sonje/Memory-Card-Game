import Leaderboard from "@/components/leadboardTable";

const LeaderboardPage = async () => {
  console.log(process.env.NEXT_PUBLIC_SOCKET_URL);
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SOCKET_URL}/api/leaderboard`
  );
  const data = await response.json();
  console.log("Leaderboard data:", data);
  return (
    <div>
      <Leaderboard data={data.leaderboard} />
    </div>
  );
};

export default LeaderboardPage;

// import Loader from "@/components/UI/Loader";

// export default function Loading() {
//   return (
//     <div className="flex justify-center items-center h-screen ">
//       <Loader message="Loading Leaderboard..." />
//     </div>
//   );
// }
