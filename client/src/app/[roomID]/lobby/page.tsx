import LobbyPage from "@/components/LobbyPage";

async function lobby({ params }: { params: { roomID: string } }) {
  const { roomID } = await params;

  return (
    <div>
      <LobbyPage params={Promise.resolve({ roomId: roomID })} />
    </div>
  );
}

export default lobby;
