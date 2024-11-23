import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { verifyToken } from '@/lib/auth';  // Note the .js extension
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '@/server/.env' });

interface CustomJwtPayload {
  userId: number;
}

interface ClientInfo {
  userId: number;
}

interface AudioMessage {
  type: 'audio';
  audio: number[];
}

const server = createServer();
const wss = new WebSocketServer({ server });

// Track connected clients
const clients = new Map<WebSocket, ClientInfo>();

wss.on('connection', async (ws: WebSocket, request: any) => {
  try {
    // Extract token from URL params
    const url = new URL(request.url!, `ws://${request.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(1008, 'Unauthorized');
      return;
    }

    // Verify token
    const decoded = await verifyToken(token) as CustomJwtPayload;
    if (!decoded || !decoded.userId) {
      ws.close(1008, 'Invalid token');
      return;
    }

    // Store client info
    clients.set(ws, { userId: decoded.userId });
    
    // Set up OpenAI WebSocket
    const realTimeApiUrl = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01";
    const openAIWs = new WebSocket(
      realTimeApiUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'OpenAI-Beta': 'realtime=v1'
        }
    });

    ws.on("open", function open() {
      console.log("Connected to server.");
      ws.send(JSON.stringify({
          type: "response.create",
          response: {
              modalities: ["text"],
              instructions: "Please assist the user.",
          }
      }));
    });
  
    ws.on("message", function incoming(message) {
        console.log("message received");
    });

  } catch (error) {
    console.error('WebSocket error:', error);
    ws.close(1011, 'Internal server error');
  }
});

const PORT = process.env.WS_PORT || 3001;
server.listen(PORT, () => {
  console.log(`WebSocket server is running on port ${PORT}`);
});