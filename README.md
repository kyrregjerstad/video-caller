# Video Calling App

A real-time video calling application built to explore and learn WebRTC technology and Cloudflare's Durable Objects. This project demonstrates how to implement peer-to-peer video communication using modern web technologies.

**Live Demo**: [https://call.kyrre.dev](https://call.kyrre.dev)

## Technology Stack

- **Backend**: Cloudflare Workers with Durable Objects
- **Frontend**: SvelteKit with TailwindCSS
- **Hosting**: Cloudflare Pages
- **Key Technology**: WebRTC for real-time communication
- **Testing**: Playwright for E2E testing
- **Build Tool**: Turborepo for monorepo management
- **Package Manager**: pnpm with workspaces

## Architecture

The application is built using a modern, serverless architecture:

- The API is powered by Cloudflare Workers, utilizing Durable Objects for maintaining connection state and managing WebRTC signaling
- The frontend is built with SvelteKit and hosted on Cloudflare Pages, providing a fast and responsive user interface
- WebRTC handles the peer-to-peer video and audio streaming between users

## Purpose

This project serves as a learning implementation for:

- WebRTC peer-to-peer communication
- Cloudflare Durable Objects for state management
- Real-time signaling server implementation
- Modern frontend development with SvelteKit
- Serverless architecture using Cloudflare's ecosystem

## Development

### Prerequisites

- Node.js >= 20
- pnpm 8.15.6 or higher
- turbo

### Getting Started

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Start the development environment:
   ```bash
   turbo dev
   ```

This will start both the frontend and backend in development mode.

## Deployment

The application is deployed using Cloudflare's infrastructure:

- Frontend: Cloudflare Pages

  - Live at [https://call.kyrre.dev](https://call.kyrre.dev)
  - Automatic deployments on push to main branch
  - Built using SvelteKit adapter for Cloudflare Pages

- Backend: Cloudflare Workers
  - Deployed using Wrangler
  - Durable Objects are automatically managed by Cloudflare

## License

[MIT](LICENSE)
