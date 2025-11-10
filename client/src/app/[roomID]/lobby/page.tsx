import GoHomeClientButton from "@/components/GoHomeClientButton";
import LobbyPage from "@/components/Lobby/LobbyPage";
import { Button } from "@/components/UI/button";
import { getGameInfo } from "@/lib/game";
 

async function lobby({ params }: { params: { roomID: string } }) {
  
  const { roomID } = await params;
  const gameInfo = await getGameInfo(roomID);
  if (!gameInfo) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-black text-white">
        <h1 className="text-3xl mb-4">Game Not Found</h1>
        {/* Render the Client Component for the button */}
        <GoHomeClientButton />
      </div>
    );
  }

  return (
     

      <div>
        <LobbyPage initialGameInfo={gameInfo} roomId={roomID} />
      </div>
     
  );
}

export default lobby;
