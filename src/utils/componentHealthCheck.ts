import { ResearchAgentService } from '../services/researchAgentService';

const researchAgentService = ResearchAgentService.getInstance();

interface HealthCheckResult {
  component: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
}

export async function runComponentHealthCheck(): Promise<HealthCheckResult[]> {
  const results: HealthCheckResult[] = [];

  // Check AI services
  const availableModels = researchAgentService.getAvailableModels();

  if (availableModels.length === 0) {
    results.push({
      component: 'AI Services',
      status: 'error',
      message: 'No AI services available. Please check API keys in .env.local'
    });
  } else {
    results.push({
      component: 'AI Services',
      status: 'ok',
      message: `Available models: ${availableModels.join(', ')}`
    });
  }

  // Check required environment variables
  const requiredEnvVars = ['VITE_GEMINI_API_KEY'];
  const missingEnvVars = requiredEnvVars.filter(
    varName => !import.meta.env[varName]
  );

  if (missingEnvVars.length > 0) {
    results.push({
      component: 'Environment',
      status: 'warning',
      message: `Missing environment variables: ${missingEnvVars.join(', ')}`
    });
  } else {
    results.push({
      component: 'Environment',
      status: 'ok',
      message: 'All required environment variables are set'
    });
  }

  // Check DOM elements
  const criticalElements = ['root'];
  const missingElements = criticalElements.filter(
    id => !document.getElementById(id)
  );

  if (missingElements.length > 0) {
    results.push({
      component: 'DOM',
      status: 'error',
      message: `Missing critical DOM elements: ${missingElements.join(', ')}`
    });
  } else {
    results.push({
      component: 'DOM',
      status: 'ok',
      message: 'All critical DOM elements present'
    });
  }

  return results;
}

// Run health check in development
if (import.meta.env.DEV) {
  runComponentHealthCheck().then(results => {
    console.group('🏥 Component Health Check');
    results.forEach(result => {
      const emoji = result.status === 'ok' ? '✅' :
                    result.status === 'warning' ? '⚠️' : '❌';
      console.log(`${emoji} ${result.component}: ${result.message}`);
    });
    console.groupEnd();
  });
}
