import { createServer } from "http";
import app from "./app.js";
import { initializeSocketIO } from "./socket/index.js";
import { SERVER_CONFIG } from "./config/constants.js";

const server = createServer(app);

// Initialize Socket.IO
initializeSocketIO(server);

server.listen(SERVER_CONFIG.PORT, () => {
  console.log(`Server running at http://localhost:${SERVER_CONFIG.PORT}`);
});
