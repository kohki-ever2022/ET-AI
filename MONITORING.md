># ET-AI Monitoring & Cost Management Guide

Complete guide for production monitoring, cost tracking, and error reporting.

---

## 📊 Overview

ET-AI includes comprehensive monitoring infrastructure:

1. **Cost Monitoring** - Real-time Claude API cost tracking and alerts
2. **Performance Monitoring** - Firebase Performance traces for all operations
3. **Error Tracking** - Sentry integration for error reporting
4. **System Health** - Health checks and status dashboards

---

## 💰 Cost Monitoring

### Features

- **Real-time cost tracking** for Claude API usage
- **Automated budget alerts** (daily, weekly, monthly)
- **Cache efficiency metrics** (90% cost reduction tracking)
- **Cost trend analysis** and visualization
- **Project-specific and global budgets**

### Setup

#### 1. Default Budgets

Default budgets are configured in `config/costAlerts.ts`:

```typescript
Daily Budget: $15 (alert at 80%)
Weekly Budget: $75 (alert at 80%)
Monthly Budget: $300 (alert at 80%)
```

#### 2. Configure Alerts

Create custom alerts for your project:

```typescript
import { createCostAlert, createBudget } from './services/costMonitoringService';

// Create a daily budget alert
await createCostAlert({
  projectId: 'your-project-id',
  threshold: 10.0, // $10 per day
  period: 'daily',
  enabled: true,
  notificationEmails: ['admin@example.com'],
});

// Create a monthly budget
await createBudget({
  projectId: 'your-project-id',
  amount: 300.0, // $300 per month
  period: 'monthly',
  alertAt: 80, // Alert at 80% usage
  enabled: true,
});
```

#### 3. View Cost Dashboard

Import and use the Cost Monitoring Dashboard component:

```tsx
import CostMonitoringDashboard from './components/CostMonitoringDashboard';

function AdminPanel() {
  return (
    <div>
      <CostMonitoringDashboard projectId="your-project-id" period="monthly" />
    </div>
  );
}
```

### Scheduled Functions

Cloud Functions run automatically:

- **Hourly**: Check budgets and send alerts
- **Daily (9 AM JST)**: Generate cost reports
- **Weekly (Sunday 2 AM)**: Clean up old records (90+ days)

### Cost Estimates

Average costs per request type (with caching):

| Request Type        | Est. Cost | Description                          |
| ------------------- | --------- | ------------------------------------ |
| Simple Query        | $0.004    | Short context, short response        |
| Document Analysis   | $0.012    | Large context, detailed response     |
| Report Generation   | $0.025    | Large context, extensive response    |
| Compliance Check    | $0.035    | Very large context, detailed analysis|

### Budget Recommendations

| Project Size | Daily | Weekly | Monthly | Description                         |
| ------------ | ----- | ------ | ------- | ----------------------------------- |
| Small        | $5    | $30    | $100    | 1-5 users, 100-500 req/month        |
| Medium       | $15   | $75    | $300    | 5-20 users, 500-2000 req/month      |
| Large        | $50   | $250   | $1000   | 20+ users, 2000+ req/month          |

---

## ⚡ Performance Monitoring

### Firebase Performance Integration

Track performance metrics for all major operations:

```typescript
import {
  trackClaudeAPICall,
  trackVectorSearch,
  trackFileUpload,
} from './services/performanceMonitoring';

// Track Claude API call
const result = await trackClaudeAPICall(
  async () => {
    // Your API call
    return await callClaude(params);
  },
  {
    projectId: 'project-123',
    modelUsed: 'claude-sonnet-4',
    inputTokens: 5000,
    outputTokens: 1500,
    cacheHitRate: 0.85,
  }
);

// Track vector search
const results = await trackVectorSearch(
  async () => {
    return await searchSimilarKnowledge(params);
  },
  {
    projectId: 'project-123',
    queryLength: query.length,
    resultCount: results.length,
    threshold: 0.7,
  }
);
```

### Custom Traces

Create custom performance traces:

```typescript
import { startTrace } from './services/performanceMonitoring';

const trace = startTrace('custom_operation');
trace.putAttribute('operation_type', 'data_processing');
trace.putMetric('items_processed', 100);

// ... perform operation ...

trace.stop();
```

### Available Traces

- `claude_api_call` - Claude API requests
- `vector_search` - Vector similarity searches
- `file_upload` - File upload operations
- `document_processing` - PDF/DOCX processing
- `authentication` - Login/logout operations
- `firestore_operation` - Firestore reads/writes
- `page_load_{pageName}` - Page load times

---

## 🐛 Error Tracking

### Sentry Integration

#### Installation

```bash
npm install --save @sentry/react @sentry/tracing
```

#### Configuration

1. **Create Sentry Project**

   - Go to [sentry.io](https://sentry.io)
   - Create new project (React)
   - Copy DSN

2. **Set Environment Variables**

   ```env
   # .env.production
   VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id
   VITE_ENABLE_ERROR_REPORTING=true
   ```

3. **Initialize in App**

   ```typescript
   import { initializeSentry } from './services/sentryIntegration';

   // In main.tsx or App.tsx
   initializeSentry();
   ```

4. **Uncomment Sentry Code**
   - Edit `services/sentryIntegration.ts`
   - Uncomment the actual Sentry integration code
   - Remove placeholder implementation

#### Usage

```typescript
import { errorReporting } from './utils/errorReporting';

// Set user context
errorReporting.setUser('user-123', 'user@example.com');

// Track actions
errorReporting.trackAction('file_uploaded', { fileName: 'report.pdf' });

// Capture errors
try {
  // ... operation ...
} catch (error) {
  errorReporting.captureError(error, {
    componentName: 'FileUploader',
    actionName: 'upload',
  });
}

// Capture messages
errorReporting.captureMessage('Important event occurred', 'info', {
  eventType: 'user_action',
});
```

#### Error Boundary

Wrap your app with Sentry's Error Boundary:

```tsx
import * as Sentry from '@sentry/react';

function App() {
  return (
    <Sentry.ErrorBoundary
      fallback={<ErrorFallback />}
      showDialog
      onError={(error, errorInfo) => {
        console.error('Error boundary caught:', error, errorInfo);
      }}
    >
      <YourApp />
    </Sentry.ErrorBoundary>
  );
}
```

### Testing Error Reporting

```typescript
import { testSentryIntegration } from './services/sentryIntegration';

// Send test error to Sentry
testSentryIntegration();
```

---

## 🏥 System Health Monitoring

### Health Check Endpoint

Cloud Function health check:

```
GET https://your-region-your-project.cloudfunctions.net/healthCheck
```

Response:

```json
{
  "status": "ok",
  "timestamp": "2025-11-18T10:00:00.000Z",
  "service": "ET-AI Cloud Functions",
  "version": "2.0.0",
  "features": [
    "File Processing (PDF/DOCX)",
    "Text Extraction",
    "Document Chunking",
    "Voyage AI Embeddings",
    "Vector Search",
    "3-Layer Deduplication",
    "Cost Monitoring & Alerts"
  ]
}
```

### Monitoring Dashboard

Create a comprehensive monitoring dashboard:

```tsx
import CostMonitoringDashboard from './components/CostMonitoringDashboard';
import SystemHealthDashboard from './components/SystemHealthDashboard'; // To be created

function MonitoringPage() {
  return (
    <div className="space-y-8">
      <h1>System Monitoring</h1>

      {/* Cost Monitoring */}
      <section>
        <h2>Cost Overview</h2>
        <CostMonitoringDashboard period="monthly" />
      </section>

      {/* System Health */}
      <section>
        <h2>System Health</h2>
        <SystemHealthDashboard />
      </section>
    </div>
  );
}
```

---

## 📈 Metrics & Analytics

### Key Metrics to Track

#### Cost Metrics

- Total API cost (daily/weekly/monthly)
- Cost per request
- Cache hit rate
- Cost savings from caching

#### Performance Metrics

- Average API response time
- P95/P99 response times
- Vector search latency
- File processing time

#### Error Metrics

- Error rate (errors per request)
- Error types distribution
- Most common errors
- Error resolution time

#### Usage Metrics

- Active users
- Requests per user
- Popular features
- Peak usage times

---

## 🔔 Alert Configuration

### Cost Alerts

Configure in Sentry or via email:

1. **Budget Threshold Alerts**

   - Alert at 80% budget usage
   - Warning at 90% budget usage
   - Critical at 100% budget usage

2. **Unusual Spike Alerts**
   - Hourly cost > $5 (unusual spike)
   - 2x average daily cost

### Error Alerts

Configure in Sentry dashboard:

1. **Critical Errors**

   - API failures
   - Authentication errors
   - Data loss errors

2. **High-frequency Errors**

   - More than 10 occurrences in 1 hour
   - Affecting multiple users

3. **New Errors**
   - First occurrence of new error type

---

## 🛠️ Troubleshooting

### Common Issues

#### High Costs

**Problem**: Monthly costs exceeding budget

**Solutions**:

1. Check cache hit rate (should be > 70%)
2. Review prompt sizes (reduce if possible)
3. Implement request rate limiting
4. Check for duplicate requests
5. Review user activity for anomalies

#### Low Cache Hit Rate

**Problem**: Cache hit rate < 50%

**Solutions**:

1. Ensure prompt caching is enabled
2. Check system prompt consistency
3. Verify cache warming is working
4. Review cache TTL settings

#### Missing Metrics

**Problem**: No data in cost dashboard

**Solutions**:

1. Verify `recordApiUsage()` is called after each Claude API call
2. Check Firestore permissions
3. Verify cost records collection exists
4. Check browser console for errors

#### Sentry Not Receiving Errors

**Problem**: No errors showing in Sentry dashboard

**Solutions**:

1. Verify VITE_SENTRY_DSN is set correctly
2. Check VITE_ENABLE_ERROR_REPORTING=true
3. Test with `testSentryIntegration()`
4. Verify Sentry SDK is installed
5. Check browser network tab for blocked requests

---

## 📝 Best Practices

### Cost Optimization

1. **Use Prompt Caching**

   - Always include stable system prompts
   - Reuse IR knowledge base across requests
   - Target 70-90% cache hit rate

2. **Optimize Token Usage**

   - Remove unnecessary context
   - Use concise prompts
   - Limit output length when appropriate

3. **Batch Operations**
   - Process multiple documents together
   - Batch embeddings generation
   - Use background jobs for non-urgent tasks

### Performance Optimization

1. **Monitor Slow Operations**

   - Set alerts for P95 > 5s
   - Investigate and optimize slow queries
   - Use caching where appropriate

2. **Use Appropriate Traces**

   - Add custom traces for business logic
   - Track critical user journeys
   - Monitor background jobs

3. **Optimize Bundle Size**
   - Code splitting
   - Lazy loading
   - Tree shaking

### Error Reporting

1. **Provide Context**

   - Always include relevant metadata
   - Set user context when available
   - Add breadcrumbs for user actions

2. **Filter Noise**

   - Ignore expected errors (e.g., network errors in dev)
   - Group similar errors
   - Set appropriate error levels

3. **Act on Errors**
   - Review daily error reports
   - Fix critical errors immediately
   - Track error trends

---

## 🚀 Production Checklist

### Before Deploying

- [ ] Cost monitoring configured
- [ ] Budget alerts set up
- [ ] Sentry project created
- [ ] Sentry DSN in environment variables
- [ ] Performance monitoring enabled
- [ ] Error reporting tested
- [ ] Health check endpoint verified
- [ ] Monitoring dashboard accessible

### After Deploying

- [ ] Verify cost tracking is working
- [ ] Check first error reports in Sentry
- [ ] Monitor performance metrics
- [ ] Set up alert channels (email/Slack)
- [ ] Create monitoring runbook
- [ ] Schedule regular reviews

---

## 📞 Support

### Resources

- [Firebase Performance Documentation](https://firebase.google.com/docs/perf-mon)
- [Sentry Documentation](https://docs.sentry.io/)
- [Claude API Pricing](https://www.anthropic.com/pricing)

### Internal Documentation

- `DEPLOYMENT.md` - Deployment guide
- `PHASE4_IMPLEMENTATION.md` - Production preparation
- `config/costAlerts.ts` - Cost configuration
- `services/costMonitoringService.ts` - Cost tracking implementation
- `services/performanceMonitoring.ts` - Performance traces

---

**Last Updated**: 2025-11-18
