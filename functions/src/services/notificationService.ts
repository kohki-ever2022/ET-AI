/**
 * Notification Service
 *
 * Sends notifications to administrators via Slack or Email.
 * Supports batch job status updates, error alerts, and system notifications.
 */

import * as functions from 'firebase-functions';

/**
 * Notification parameters
 */
export interface NotificationParams {
  type: 'success' | 'error' | 'warning';
  jobId: string;
  title?: string;
  message?: string;
  result?: any;
  error?: string;
  duration?: number;
}

/**
 * Get Slack Webhook URL from Firebase config
 */
function getSlackWebhookUrl(): string | undefined {
  try {
    return functions.config().slack?.webhook_url;
  } catch (error) {
    console.warn('Firebase config not available. Slack notifications disabled.');
    return undefined;
  }
}

/**
 * Send Slack notification
 */
export async function sendSlackNotification(params: NotificationParams): Promise<void> {
  const webhookUrl = getSlackWebhookUrl();

  if (!webhookUrl) {
    console.warn('SLACK_WEBHOOK_URL not configured. Skipping Slack notification.');
    console.log('Notification (console fallback):', params);
    return;
  }

  const color = params.type === 'success' ? '#36a64f' : params.type === 'error' ? '#ff0000' : '#ffaa00';
  const emoji = params.type === 'success' ? ':white_check_mark:' : params.type === 'error' ? ':x:' : ':warning:';

  const title = params.title || (params.type === 'success'
    ? 'Weekly Pattern Extraction Completed'
    : params.type === 'error'
    ? 'Weekly Pattern Extraction Failed'
    : 'Weekly Pattern Extraction Warning');

  const message = params.message || (params.type === 'success'
    ? `Job completed successfully in ${(params.duration! / 1000).toFixed(2)}s`
    : params.type === 'error'
    ? `Job failed with error: ${params.error}`
    : 'Job completed with warnings');

  const fields: Array<{ title: string; value: string; short: boolean }> = [
    { title: 'Job ID', value: params.jobId, short: true },
    { title: 'Type', value: params.type.toUpperCase(), short: true },
  ];

  if (params.duration) {
    fields.push({ title: 'Duration', value: `${(params.duration / 1000).toFixed(2)}s`, short: true });
  }

  // Add result details for success
  if (params.type === 'success' && params.result) {
    fields.push(
      { title: 'Projects Processed', value: String(params.result.projectsProcessed), short: true },
      { title: 'Chats Analyzed', value: String(params.result.chatsAnalyzed), short: true },
      { title: 'Knowledge Archived', value: String(params.result.knowledgeArchived), short: true },
      {
        title: 'Patterns Extracted',
        value: `V:${params.result.patternsExtracted.vocabulary}, S:${params.result.patternsExtracted.structure}, E:${params.result.patternsExtracted.emphasis}, T:${params.result.patternsExtracted.tone}, L:${params.result.patternsExtracted.length}`,
        short: false,
      }
    );
  }

  const payload = {
    username: 'ET-AI Batch Job',
    icon_emoji: emoji,
    attachments: [
      {
        color,
        title,
        text: message,
        fields,
        footer: 'ET-AI System',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Failed to send Slack notification:', response.statusText);
    } else {
      console.log('Slack notification sent successfully');
    }
  } catch (error) {
    console.error('Error sending Slack notification:', error);
  }
}

/**
 * Send notification (delegates to appropriate service)
 */
export async function sendNotification(params: NotificationParams): Promise<void> {
  // Try Slack first
  await sendSlackNotification(params);

  // Future: Add email support
  // await sendEmailNotification(params);
}
