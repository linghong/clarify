import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { verifyToken } from '@/lib/auth';
import dotenv from 'dotenv';

import { AgentRegistry } from './AgentRegistry';
import { FrontlineAgent } from '../agents/FrontlineAgent';
import { ExpertAgent } from '../agents/ExpertAgent';
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
    const customWs = asCustomWebSocket(ws)
    // Initialize client state
    let isAIResponding = false;

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

    const registry = AgentRegistry.getInstance();
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY
    // Initialize OpenAI WebSocket connection
    const openAIWs = asCustomWebSocket(new WebSocket("wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01", {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'realtime=v1'
      }
    }));

    // Create agents without messageBroker
    const frontlineAgent = new FrontlineAgent(customWs, openAIWs);
    const expertAgent = new ExpertAgent(customWs, openAIWs);
    const researchAgent = new ResearchAgent(customWs, openAIWs);

    registry.registerAgent(decoded.userId.toString(), frontlineAgent);
    registry.registerAgent(decoded.userId.toString(), expertAgent);
    registry.registerAgent(decoded.userId.toString(), researchAgent)

    // Store client info
    clients.set(ws, {
      userId: decoded.userId,
      openAIWs: openAIWs
    });

    // Handle incoming messages
    customWs.on('message', async (message: string) => {
      const data = JSON.parse(message);
      await frontlineAgent.handleMessage(data);

    });
    // Handle messages from browser client
  } catch (error) {
    console.error('WebSocket connection error:', error);
    ws.close(1011, 'Internal server error');
  }
});

const PORT = process.env.WS_PORT || 3001;
server.listen(PORT, () => {
  console.log(`WebSocket server is running on port ${PORT}`);
});