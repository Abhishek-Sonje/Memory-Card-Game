import GamePage from "@/components/GamePage";

 

async function lobby({ params }: { params: { roomID: string } }) {
  const { roomID } = await params;

  return (
    <div>
      <GamePage params={Promise.resolve({ roomId: roomID })}   />
    </div>
  );
}

export default lobby;
