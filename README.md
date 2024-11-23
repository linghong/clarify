# Clarify

A real-time voice chat application using OpenAI's Realtime API and AI agents.

## Features

- 🔐 User authentication
- 🎙️ Real-time voice chat
- 🤖 OpenAI GPT integration
- 🔄 WebSocket real-time communication

## Tech Stack

- **Frontend**: Next.js 15, React 19, TailwindCSS
- **Backend**: Node.js WebSocket Server
- **Database**: SQLite with TypeORM
- **Authentication**: JWT with cookie-based sessions
- **API**: OpenAI Realtime API

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenAI API key

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/clarify.git
   cd clarify
   ```

2. Install dependencies for main project
   ```bash
   npm install
   ```

3. Install dependencies for WebSocket server
   ```bash
   cd server
   npm install
   cd ..
   ```

4. Set up environment variables
   ```bash
   cp .env.example .env
   cp server/.env.example server/.env
   ```
   
   Add the following to both `.env` files:
   ```env
   # Root .env
   OPENAI_API_KEY=your_key_here
   JWT_SECRET=your_secret_here

   # server/.env
   OPENAI_API_KEY=your_key_here
   WS_PORT=3001
   ```

### Development

Run the development server:
```bash
npm run dev
```

This starts:
- Next.js on [http://localhost:3000](http://localhost:3000)
- WebSocket server on port 3001 (automatically through concurrently)

### Production

Build and start the production server:
```bash
npm run build
npm start
```

## Project Structure
```
clarify/
├── app/              # Next.js app router
│   ├── api/         # API routes
│   ├── auth/        # Authentication pages
│   └── dashboard/   # Main application
├── server/          # WebSocket server
│   └── websocket.ts # WebSocket implementation
├── components/      # React components
├── lib/            # Shared utilities
└── public/         # Static assets
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'feat: add some amazing feature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

MIT