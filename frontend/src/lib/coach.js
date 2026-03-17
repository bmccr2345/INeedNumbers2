// AI Coach API client utilities

import { safeLocalStorage } from '../utils/safeStorage';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * Fetch AI coaching insights with non-streaming response
 * @param {boolean} force - Bypass cache if true
 * @param {number} year - Year for P&L data (optional)
 * @returns {Promise<Object>} Coaching response with summary, stats, actions, risks, next_inputs
 */
export async function fetchCoachJSON(force = false, year = null) {
  const body = { 
    stream: false, 
    force,
    ...(year && { year })
  };

  const response = await fetch(`${BACKEND_URL}/api/ai-coach-v2/generate`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error("Upgrade to Pro required for AI Coach");
    }
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      throw new Error(`Rate limit exceeded. Try again in ${retryAfter} seconds.`);
    }
    const errorText = await response.text();
    throw new Error(errorText || 'AI Coach request failed');
  }

  return response.json();
}

/**
 * Fetch AI coaching insights with streaming response
 * @param {boolean} force - Bypass cache if true
 * @param {function} onToken - Callback for each token received
 * @param {function} onComplete - Callback when streaming completes
 * @param {function} onError - Callback for errors
 */
export async function fetchCoachStream(force = false, onToken, onComplete, onError) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/ai-coach-v2/generate`, {
      method: "POST",
      credentials: "include", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stream: true, force })
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Streaming not supported');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      
      // Process complete lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            if (data.delta) {
              onToken(data.delta);
            } else if (data.done) {
              onComplete();
              return;
            } else if (data.fallback) {
              onComplete(data.fallback);
              return;
            } else if (data.error) {
              throw new Error(data.error);
            }
          } catch (e) {
            console.warn('Failed to parse streaming data:', line);
          }
        }
      }
    }
    
    onComplete();
    
  } catch (error) {
    onError(error);
  }
}

/**
 * Get AI Coach diagnostics for debugging
 * @returns {Promise<Object>} Diagnostic information about user's data
 */
export async function fetchCoachDiagnostics() {
  const response = await fetch(`${BACKEND_URL}/api/ai-coach-v2/diag`, {
    method: "GET",
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

/**
 * Parse actions from coach response and mark as checkable items
 * @param {Array} actions - Actions array from coach response
 * @returns {Array} Actions with completion status from localStorage
 */
export function parseActionsWithCompletion(actions, userId) {
  if (!actions || !Array.isArray(actions)) return [];
  
  const storageKey = `coach_actions_${userId}`;
  const completedActionsStr = safeLocalStorage.getItem(storageKey, '{}');
  let completedActions = {};
  
  try {
    completedActions = JSON.parse(completedActionsStr);
  } catch (e) {
    console.warn('[Coach] Failed to parse completed actions:', e);
  }
  
  return actions.slice(0, 3).map((action, index) => ({
    id: `${userId}_${index}`,
    text: typeof action === 'string' ? action : (action.text || action.title || String(action)),
    completed: completedActions[`${userId}_${index}`] || false
  }));
}

/**
 * Mark action as completed/uncompleted
 * @param {string} actionId - Unique action identifier
 * @param {boolean} completed - Completion status
 * @param {string} userId - User ID for storage
 */
export function toggleActionCompletion(actionId, completed, userId) {
  const storageKey = `coach_actions_${userId}`;
  const completedActionsStr = safeLocalStorage.getItem(storageKey, '{}');
  let completedActions = {};
  
  try {
    completedActions = JSON.parse(completedActionsStr);
  } catch (e) {
    console.warn('[Coach] Failed to parse completed actions:', e);
  }
  
  if (completed) {
    completedActions[actionId] = true;
  } else {
    delete completedActions[actionId];
  }
  
  safeLocalStorage.setItem(storageKey, JSON.stringify(completedActions));
}