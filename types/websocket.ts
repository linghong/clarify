import { WebSocket as WsWebSocket } from 'ws';

// Define a custom WebSocket interface compatible with BaseAgent
export interface CustomWebSocket extends WsWebSocket {
  binaryType: "arraybuffer";
  dispatchEvent: (event: Event) => boolean;
}

// Helper function to convert WebSocket to CustomWebSocket
export const asCustomWebSocket = (ws: WsWebSocket): CustomWebSocket => {
  const customWs = ws as CustomWebSocket;
  customWs.binaryType = 'arraybuffer'; // Default to a compatible value
  customWs.dispatchEvent = () => {
    return true; // Default implementation
  };
  return customWs;
};
