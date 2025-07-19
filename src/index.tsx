import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { FunctionCallProvider } from '@/components/FunctionCallDock'
import { FunctionCallingService } from '@/services/functionCallingService'
import '@/index.css'

const functionHistory = FunctionCallingService.getInstance().getExecutionHistory();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <FunctionCallProvider initialHistory={functionHistory}>
        <App />
      </FunctionCallProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
