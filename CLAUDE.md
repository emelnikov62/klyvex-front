# CLAUDE.md — klyvex-front

## Project Overview

Klyvex — AI-агрегатор, предоставляющий единый интерфейс для работы с различными AI-моделями (текст, изображения, видео, аудио). Двухпанельный workspace позволяет параллельно работать с разными моделями.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite (port 8080)
- **State:** Redux Toolkit (slices: userContext, socketContext, sessionContext) + React Context (AuthContext)
- **UI:** shadcn/ui + Radix UI, Tailwind CSS 3 (dark mode by default, primary color: lime #49FF00)
- **Data:** TanStack React Query, React Hook Form + Zod
- **Realtime:** Socket.io-client → Node.js relay server → RabbitMQ → backend microservices
- **Auth:** Email + Google OAuth (@react-oauth/google)
- **Animation:** Framer Motion
- **Backend (server/):** Express + Socket.io + RabbitMQ relay, отдельный package.json

## Project Structure

```
src/
├── components/       # React-компоненты (ui/, workspace/, landing/, tariffs/, header/)
├── pages/            # Страницы (Landing, Workspace, Storage, Tariffs, Settings, Login, Register, NotFound)
├── lib/
│   ├── store/        # Redux store (store.ts)
│   ├── slices/       # Redux slices (userContextSlice, socketContextSlice, sessionContextSlice)
│   ├── service/      # MessageService, SocketService
│   ├── kernel/       # Domain models, PrivateRoute
│   ├── enums/        # Конфигурация, константы
│   ├── types/        # TypeScript типы (Request, Response, User, ChatSession, AiModel и др.)
│   └── utils/        # Утилиты
├── contexts/         # AuthContext — аутентификация, профиль, проекты, модели
├── hooks/            # use-panel-state, use-mobile, use-popup, use-toast
├── test/             # Vitest setup и тесты
└── main.tsx          # Entry point (React 18 createRoot)

server/
└── app.js            # HTTPS relay server (Express + Socket.io + RabbitMQ)
```

## Key Commands

```bash
# Frontend
npm run dev           # Dev server (Vite, port 8080)
npm run build         # Production build
npm run build:dev     # Development build
npm run lint          # ESLint
npm run test          # Vitest (single run)
npm run test:watch    # Vitest (watch mode)
npm run preview       # Preview production build

# Backend
cd server && node app.js <domain> <port> <cert> <key> <ca>
```

## Architecture & Communication

- **Routing:** React Router v6, `/workspace` защищён через PrivateRoute (AuthContext.isAuthenticated)
- **Socket.io события:**
  - `send-main-event` → RabbitMQ `klyvex-requests` → основной backend
  - `send-ai-event` → RabbitMQ `klyvex-front-ai-requests` → AI-сервис
  - Ответы приходят через `receive-main-event-{userId}` / `receive-ai-event-{userId}`
- **MessageService** реализует request-response паттерн поверх Socket.io с таймаутами и callback-регистрацией
- **Типы запросов:** auth, register, pay, folder, project, request, dictionary

## Key Patterns

- **Providers в App.tsx:** Redux Provider → GoogleOAuthProvider → QueryClientProvider → AuthProvider → TooltipProvider → BrowserRouter
- **Данные пользователя** кэшируются в localStorage (ключ: `klyvex`)
- **shadcn/ui компоненты** в `src/components/ui/` — 54+ компонента
- **Tailwind:** CSS-переменные для темы, кастомные анимации (pulse-glow, float, fade-in, scale-in), glow-утилиты
- **Path alias:** `@/*` → `./src/*`

## Testing

- **Unit:** Vitest + @testing-library/react + jest-dom (environment: jsdom)
- **E2E:** Playwright
- Тесты пока минимальные (example.test.ts, App.test.tsx)

## Important Notes

- `tsconfig.app.json` — strict: false
- Frontend и server — независимые сервисы с отдельными package.json, деплоятся раздельно
- Основная ветка: `main`
