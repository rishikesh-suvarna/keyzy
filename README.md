![Keyzy Logo](https://raw.githubusercontent.com/rishikesh-suvarna/keyzy/main/logo-horizontal.png)


# Keyzy - Secure Password Manager

A modern, full-stack password manager built with Next.js and Go, featuring military-grade encryption and a beautiful black & white design.

## Features

- Military-Grade Security: AES-256 encryption for all stored passwords
- Smart Password Generation: Customizable password generator with strength indicators
- Dark/Light Mode: Beautiful black & white theme with system preference detection
- Responsive Design: Works seamlessly on desktop, tablet, and mobile
- Firebase Authentication: Secure user authentication with Google OAuth support
- Real-time Updates: Instant password management with optimistic UI updates
- Modern UI: Clean, minimalist design focused on usability and security

## Tech Stack

### Frontend
- Next.js 14 - React framework with App Router
- TypeScript - Type-safe development
- Tailwind CSS 3 - Utility-first styling
- Firebase Auth - Authentication & user management
- React Hot Toast - Beautiful notifications
- Lucide React - Modern icon library

### Backend
- Go - High-performance backend API
- PostgreSQL - Reliable database with raw SQL queries
- JWT Tokens - Secure authentication via Firebase
- AES-256 Encryption - Password encryption at rest
- CORS Support - Cross-origin resource sharing

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Go 1.21+
- PostgreSQL 14+
- Firebase project with Authentication enabled

### Frontend Setup

```bash
# Clone the repository
git clone https://github.com/rishikesh-suvarna/keyzy.git
cd keyzy/client

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Configure Firebase
# Add your Firebase config to .env.local:
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
# ... other Firebase config

# Start development server
npm run dev
```

### Backend Setup

```bash
# Navigate to server directory
cd keyzy/server

# Install Go dependencies
go mod download

# Set up environment variables
cp .env.example .env

# Configure your .env file:
DATABASE_URL=postgres://user:password@localhost/keyzy?sslmode=disable
ENCRYPTION_KEY=your_encryption_key
FIREBASE_PROJECT_ID=your_project_id
GOOGLE_APPLICATION_CREDENTIALS=path/to/your/firebase/credentials.json
PORT=8080

# Run database migrations
go run cmd/migrate/main.go

# Start the server
go run main.go
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Tailwind CSS](https://tailwindcss.com) for the utility-first CSS framework
- [Lucide](https://lucide.dev) for the beautiful icon set
- [Firebase](https://firebase.google.com) for authentication services
- [Vercel](https://vercel.com) for frontend hosting
- The open-source community for inspiration and tools

---

Built with love for security and beauty

For questions or support, please open an issue or contact [rishikeshsuvarna@gmail.com](mailto:rishikeshsuvarna@gmail.com)