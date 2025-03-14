import "reflect-metadata";
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { verifyToken } from '../lib/auth';
import dotenv from 'dotenv';
import { getUserProfile } from '@/lib/getUserProfile';

import { AgentRegistry } from './AgentRegistry';
import { FrontlineAgent } from '../agents/FrontlineAgent';
import { VisualAgent } from '../agents/VisualAgent';
import { ResearchAgent } from '../agents/ResearchAgent';
import { asCustomWebSocket } from '../types/websocket';

dotenv.config({ path: '@/server/.env' });

interface CustomJwtPayload {
  userId: number;
}

interface ClientInfo {
  userId: number;
  openAIWs?: WebSocket;
}

const server = createServer();
const wss = new WebSocketServer({ server });
const clients = new Map<WebSocket, ClientInfo>();

wss.on('connection', async (ws: WebSocket, request: any) => {
  try {
    const model = request.url.split('model=')[1] || 'gpt-4o-mini-realtime-preview-2024-12-17';
    const customWs = asCustomWebSocket(ws);

    // Auth verification
    const url = new URL(request.url!, `ws://${request.headers.host}`);
    if (!request.url) {
      ws.close(1008, 'Unauthorized: Missing URL');
      return;
    }
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(1008, 'Unauthorized');
      return;
    }

    const decoded = await verifyToken(token) as CustomJwtPayload;
    if (!decoded || !decoded.userId) {
      ws.close(1008, 'Invalid token');
      return;
    }

    const userProfileText = await getUserProfile(token);

    const registry = AgentRegistry.getInstance();

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY
    // Initialize OpenAI WebSocket connection
    const openAIWs = asCustomWebSocket(new WebSocket(`wss://api.openai.com/v1/realtime?model=${model}`, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'realtime=v1'
      }
    }));

    // Create agents without messageBroker
    const frontlineAgent = new FrontlineAgent(customWs, openAIWs, userProfileText);
    const visualAgent = new VisualAgent(customWs, openAIWs);
    const researchAgent = new ResearchAgent(customWs, openAIWs);

    registry.registerAgent(`${decoded.userId}_frontline`, frontlineAgent);
    registry.registerAgent(`${decoded.userId}_visual`, visualAgent);
    registry.registerAgent(`${decoded.userId}_research`, researchAgent);

    customWs.on("open", function open() {
      console.log("Connected to OpenAI realtime APIserver.");
    });

    // Handle incoming messages
    customWs.on('message', async (message: string) => {
      const data = JSON.parse(message);
      await frontlineAgent.handleMessage(data);
    });

  } catch (error) {
    console.error('WebSocket connection error:', error);
    ws.close(1011, 'Internal server error');
  }
});

const PORT = process.env.WS_PORT || 3001;
server.listen(PORT, () => {
  console.log(`WebSocket server is running on port ${PORT}`);
});