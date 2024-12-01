import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { verifyToken } from '@/lib/auth';
import dotenv from 'dotenv';

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

    // Initialize OpenAI WebSocket connection
    const openAIWs = new WebSocket("wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01", {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'OpenAI-Beta': 'realtime=v1'
      }
    });

    // Store client info
    clients.set(ws, {
      userId: decoded.userId,
      openAIWs: openAIWs
    });

    // Handle messages from browser client
    ws.on('message', async (message: string) => {
      // Check if OpenAI is already processing a response
      if (isAIResponding) return;

      isAIResponding = true; // Set the flag before sending request to OpenAI
      try {
        const data = JSON.parse(message);
        console.log('Received message type:', data.type);
        const clientInfo = clients.get(ws)!;
        /*if (!data.type || data.type !== 'audio' || !data.audio) {
          ws.send(JSON.stringify({ type: 'error', error: 'Invalid input' }));
          return;
        }*/
        switch (data.type) {
          case 'text':
            if (openAIWs && openAIWs.readyState === WebSocket.OPEN) {
              console.log("here", data.text)
              //console.log("Encoded base64 audio:", data.audio.slice(0, 100));
              // First, create the conversation item
              const createConversationEvent = {
                type: "conversation.item.create",
                item: {
                  type: "message",
                  role: "user",
                  content: [{
                    type: "input_text",
                    text: data.text
                  }]
                }
              };
              openAIWs.send(JSON.stringify(createConversationEvent));
              // Then, request the response
              const createResponseEvent = {
                type: "response.create",
                response: {
                  modalities: ['text', 'audio'], // Explicitly request audio
                  instructions: "Respond naturally and conversationally.",
                },
              };
              openAIWs.send(JSON.stringify(createResponseEvent));
            }
            break;

          case 'audio':
            // Check if this is an empty audio chunk (indicates stopping)
            if (!data.audio || data.audio.length === 0) {
              console.log("Received empty audio - ending session");
              if (openAIWs && openAIWs.readyState === WebSocket.OPEN) {
                const endSessionEvent = {
                  type: "session.end"
                };
                openAIWs.send(JSON.stringify(endSessionEvent));
              }
              isAIResponding = false;
            } else {
              // Handle normal audio chunk
              console.log("Received audio chunk, length:", data.audio.length);
              if (openAIWs && openAIWs.readyState === WebSocket.OPEN) {
                const createConversationEvent = {
                  type: "conversation.item.create",
                  item: {
                    type: "message",
                    role: "user",
                    content: [{
                      type: 'input_audio',
                      audio: data.audio
                    }]
                  }
                };
                openAIWs.send(JSON.stringify(createConversationEvent));
                const createResponseEvent = {
                  type: "response.create",
                  response: {
                    modalities: ['text', 'audio'], // Explicitly request audio
                    instructions: "Respond naturally and conversationally.",
                  },
                };
                openAIWs.send(JSON.stringify(createResponseEvent));
              }
            }
            break;

          default:
            console.log('Unhandled message type:', data.type);
        }
      } catch (error) {
        console.error('Error processing message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          error: 'Failed to process message'
        }));
      }
    });

    // Handle OpenAI responses
    openAIWs.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());

        switch (data.type) {
          case 'conversation.item.created':
            console.log('Conversation item created');
            break;

          case 'response.created':
            console.log('Response created');
            break;

          case 'response.done':
            console.log('Response completed');
            isAIResponding = false;
            break;


          case 'response.content_part.added':
            // Handle initial content part
            if (data.part?.type === 'audio' || data.part?.type === 'text') {
              console.log('Content part added:', data.part.type);
            }
            break;

          case 'response.content_part.done':
            // Handle completion of content part
            if (data.part?.type === 'audio') {
              ws.send(JSON.stringify({
                type: 'audio_done',
                transcript: data.part.transcript
              }));
            }
            break;

          case 'response.text.delta':
            // Forward text response to client
            const isEndOfSentence = /[.!?](\s|$)/.test(data.delta);
            ws.send(JSON.stringify({
              type: 'text',
              text: data.delta,
              isEndOfSentence
            }));
            break;

          case 'response.text.done':
            ws.send(JSON.stringify({
              type: 'text_done',
              text: data.text
            }));
            isAIResponding = false;
            break;

          case 'response.audio.delta':
            ws.send(JSON.stringify({
              type: 'audio_response',
              audio: data.delta,
              format: 'pcm16',
              isEndOfSentence: data.isEndOfSentence || false
            }));

            break;

          case 'response.audio.done':
            ws.send(JSON.stringify({
              type: 'audio_done'
            }));
            isAIResponding = false;
            break;

          case 'response.audio_transcript.delta':
            console.log('transcript', data.delta);
            ws.send(JSON.stringify({
              type: 'transcript',
              text: data.delta
            }));
            break;



          case 'response.audio_transcript.done':
            // Send complete transcript
            ws.send(JSON.stringify({
              type: 'transcript_done',
              text: data.transcript
            }));
            break;



          case 'error':
            console.error('OpenAI error:', data);
            ws.send(JSON.stringify({
              type: 'error',
              error: data.error?.message || 'AI processing error'
            }));
            isAIResponding = false;
            break;

          default:
            console.log('Unhandled message type:', data.type, data);
        }
      } catch (error) {
        console.error('Error handling OpenAI message:', error);
      }
    });



    // Handle cleanup
    ws.on('close', () => {
      const clientInfo = clients.get(ws);
      if (clientInfo?.openAIWs) {
        clientInfo.openAIWs.close();
      }
      clients.delete(ws);
    });

    openAIWs.on("open", function open() {
      console.log("connectted to OpenAI")
    });

    openAIWs.on('close', () => {
      console.log('Remote OpenAI WebSocket connection closed');
    });

    // Handle OpenAI errors
    openAIWs.on('error', (error) => {
      console.error('OpenAI WebSocket error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        error: 'AI connection error'
      }));
      ws.close(1011, 'OpenAI connection failed');
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