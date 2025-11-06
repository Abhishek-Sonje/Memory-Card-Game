import Leaderboard from "@/components/leadboard";



const LeaderboardPage = async () => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_SOCKET_URL}/leaderboard`);
  const data = await response.json();
  console.log("Leaderboard data:", data);
  return (
    <div>
      <h1>Leaderboard</h1>
      <Leaderboard data={data.leaderboard} />
    </div>
  );
};

export default LeaderboardPage;
