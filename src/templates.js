export const templates = [
  {
    id: 'react',
    name: 'React',
    category: 'frontend',
    language: 'TypeScript',
    framework: 'TanStack Start',
    description: 'Complete React starter with Pubflow integration.',
    repo: 'pubflow/react-flowfull-client',
    branch: 'master',
    installCommand: 'bun install',
    devCommand: 'bun run dev',
  },
  {
    id: 'react-native',
    name: 'React Native Expo',
    category: 'frontend',
    language: 'TypeScript',
    framework: 'Expo',
    description: 'Cross-platform mobile starter for iOS and Android.',
    repo: 'pubflow/create-pubflow-rn',
    branch: 'master',
    installCommand: 'npm install',
    devCommand: 'npx expo start',
  },
  {
    id: 'node-backend',
    name: 'Node.js Backend',
    category: 'backend',
    language: 'TypeScript',
    framework: 'Flowfull',
    description: 'Official Node.js / TypeScript Flowfull backend starter.',
    repo: 'pubflow/flowfull-node',
    branch: 'master',
    installCommand: 'npm install',
    devCommand: 'npm run dev',
  },
  {
    id: 'python-backend',
    name: 'Python Backend',
    category: 'backend',
    language: 'Python',
    framework: 'FastAPI',
    description: 'Flowfull backend starter powered by Python and FastAPI.',
    repo: 'pubflow/flowfull-python-starter',
    branch: 'master',
    installCommand: 'pip install -r requirements.txt',
    devCommand: 'uvicorn app.main:app --reload --host 0.0.0.0 --port 3001',
  },
  {
    id: 'go-backend',
    name: 'Go Backend',
    category: 'backend',
    language: 'Go',
    framework: 'Gin',
    description: 'Flowfull backend starter for high-performance Go APIs.',
    repo: 'pubflow/flowfull-go-starter',
    branch: 'master',
    installCommand: 'go mod download',
    devCommand: 'go run cmd/server/main.go',
  },
  {
    id: 'elixir-backend',
    name: 'Elixir Backend',
    category: 'backend',
    language: 'Elixir',
    framework: 'Flowfull',
    description: 'Flowfull backend starter for Elixir applications.',
    repo: 'pubflow/flowfull-elixir-starter',
    branch: 'master',
    installCommand: 'mix deps.get',
    devCommand: 'mix phx.server',
  },
];

export function getTemplate(id) {
  return templates.find((template) => template.id === id);
}

export function getTemplatesByCategory(category) {
  return templates.filter((template) => template.category === category);
}
