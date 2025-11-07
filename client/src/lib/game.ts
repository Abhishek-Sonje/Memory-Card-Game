export async function getGameInfo(roomId: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SOCKET_URL}/api/${roomId}/game`,
      { cache: "no-store" } // always fetch fresh data
    );

    if (!res.ok) {
      console.warn(`Game ${roomId} not found`);
      return null;
    }

    const { game } = await res.json();
    return game;
  } catch (err) {
    console.error("Failed to fetch game:", err);
    return null;
  }
}
