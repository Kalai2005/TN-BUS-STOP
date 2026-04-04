const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const OPENAI_ENABLED = String(process.env.OPENAI_ENABLED || 'true').toLowerCase() !== 'false';
const OPENAI_QUOTA_COOLDOWN_MS = Number.parseInt(process.env.OPENAI_QUOTA_COOLDOWN_MS || '900000', 10);

let quotaBlockedUntil = 0;
let lastFallbackLogKey = '';
let lastFallbackLogAt = 0;

function isQuotaCooldownActive() {
  return Date.now() < quotaBlockedUntil;
}

function activateQuotaCooldown() {
  const cooldownMs = Number.isFinite(OPENAI_QUOTA_COOLDOWN_MS) && OPENAI_QUOTA_COOLDOWN_MS > 0
    ? OPENAI_QUOTA_COOLDOWN_MS
    : 900000;

  quotaBlockedUntil = Date.now() + cooldownMs;
}

function isPlaceholderOpenAIKey(apiKey) {
  const value = String(apiKey || '').trim();

  if (!value) {
    return true;
  }

  if (value.toLowerCase().includes('your_openai_api_key_here')) {
    return true;
  }

  if (/^your[_-]/i.test(value)) {
    return true;
  }

  return !value.startsWith('sk-');
}

function buildFallbackReply(rawMessage) {
  const message = String(rawMessage || '').toLowerCase();

  if (/(book|booking|reserve|seat)/.test(message)) {
    return 'To book a seat: Search buses, open a route, select seats, confirm passenger details, and complete booking. After booking, open My Bookings for your QR ticket and download link.';
  }

  if (/(cancel|refund)/.test(message)) {
    return 'To cancel: Open My Bookings, select a confirmed booking, and tap Cancel. Refund status depends on your booking/payment policy and booking state.';
  }

  if (/(ticket|qr|download|pdf)/.test(message)) {
    return 'For tickets: Open My Bookings, open your booking, and scan/show the QR at boarding. Use the download option to save the ticket PDF on phone.';
  }

  if (/(login|sign in|google|account|profile)/.test(message)) {
    return 'For login issues: Verify email/password or Google sign-in setup, then log in and check your profile from the top navigation. If Google fails, confirm authorized origins in Google Cloud Console.';
  }

  if (/(route|bus|time|source|destination|travel)/.test(message)) {
    return 'Use Search to find buses between source and destination. Then compare departure/arrival times, route details, and fare before booking.';
  }

  return 'I can help with bus search, booking, QR tickets, cancellations, login/profile, and travel tips. Tell me what you want to do and I will guide you step by step.';
}

function getOpenAIKey() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (isPlaceholderOpenAIKey(apiKey)) {
    throw new Error('OPENAI_API_KEY is not set in the environment.');
  }

  return apiKey;
}

function shouldUseLocalFallback(error) {
  const message = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '').toLowerCase();
  const type = String(error?.type || '').toLowerCase();

  const status = Number(error?.status || 0);

  if (status === 401 || status === 429) {
    return true;
  }

  return (
    message.includes('openai is disabled')
    || message.includes('quota cooldown')
    || message.includes('api key')
    || message.includes('insufficient_quota')
    || message.includes('rate limit')
    || message.includes('quota')
    || code === 'insufficient_quota'
    || code === 'rate_limit_exceeded'
    || type === 'insufficient_quota'
  );
}

function describeFallbackReason(error) {
  const status = Number(error?.status || 0);
  const code = String(error?.code || '').trim() || 'n/a';
  const type = String(error?.type || '').trim() || 'n/a';
  const message = String(error?.message || '').trim() || 'Unknown OpenAI error';

  if (status === 429 || code === 'insufficient_quota' || type === 'insufficient_quota') {
    return 'OpenAI quota exceeded (429 insufficient_quota). Update plan/billing or use a key with available quota.';
  }

  if (status === 401) {
    return 'OpenAI authentication failed (401). Verify OPENAI_API_KEY is valid and active.';
  }

  if (String(error?.code || '') === 'quota_cooldown_active') {
    return 'OpenAI quota cooldown active after recent quota/rate-limit failure. Using local fallback temporarily.';
  }

  return `OpenAI request failed (status=${status || 'n/a'}, code=${code}, type=${type}): ${message}`;
}

function warnFallback(scope, error) {
  const reason = describeFallbackReason(error);
  const key = `${scope}:${reason}`;
  const now = Date.now();

  // Suppress duplicate warning noise for 60s while keeping first actionable error visible.
  if (key === lastFallbackLogKey && (now - lastFallbackLogAt) < 60000) {
    return;
  }

  lastFallbackLogKey = key;
  lastFallbackLogAt = now;
  console.warn(`[AI Fallback] ${scope}: ${reason}`);
}

async function callOpenAI(messages, { maxTokens = 300, temperature = 0.4 } = {}) {
  if (!OPENAI_ENABLED) {
    const disabledError = new Error('OpenAI is disabled by OPENAI_ENABLED=false.');
    disabledError.code = 'openai_disabled';
    throw disabledError;
  }

  if (isQuotaCooldownActive()) {
    const cooldownError = new Error('OpenAI quota cooldown active. Using local fallback.');
    cooldownError.code = 'quota_cooldown_active';
    throw cooldownError;
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getOpenAIKey()}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.error?.message || `OpenAI request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.code = payload?.error?.code;
    error.type = payload?.error?.type;

    if (shouldUseLocalFallback(error) && (error.status === 429 || error.code === 'insufficient_quota' || error.type === 'insufficient_quota')) {
      activateQuotaCooldown();
    }

    throw error;
  }

  return String(payload?.choices?.[0]?.message?.content || '').trim();
}

export async function getTravelAdvice(source, destination) {
  try {
    const responseText = await callOpenAI([
      {
        role: 'system',
        content: 'You are TN Smart Bus Assistant for a Tamil Nadu bus booking app. Give concise, practical travel advice.',
      },
      {
        role: 'user',
        content: `Provide travel advice for a bus journey from ${source} to ${destination} in Tamil Nadu. Include best time to travel, what to carry, and any famous stops along the way. Keep it concise.`,
      },
    ], { maxTokens: 220, temperature: 0.5 });

    return responseText || 'Travel advice currently unavailable.';
  } catch (error) {
    if (shouldUseLocalFallback(error)) {
      warnFallback('travel-advice', error);
      return 'Travel advice currently unavailable right now. Please try again later.';
    }

    console.error('OpenAI Travel Advice Error:', error);
    return 'Travel advice currently unavailable.';
  }
}

export async function getChatbotReply({ message, history = [] }) {
  try {
    const prompt = String(message || '').trim();
    if (!prompt) {
      return 'Please type a message so I can help you.';
    }

    const recentHistory = Array.isArray(history) ? history.slice(-8) : [];
    const conversationMessages = recentHistory
      .map((item) => {
        const role = String(item?.role || 'user').toLowerCase() === 'assistant' ? 'assistant' : 'user';
        const content = String(item?.content || '').trim();
        return content ? { role, content } : null;
      })
      .filter(Boolean);

    const responseText = await callOpenAI([
      {
        role: 'system',
        content: [
          'You are TN Smart Bus Assistant for a Tamil Nadu bus booking app.',
          'Help with routes, bookings, ticket download, cancellations, login, and travel tips.',
          'Keep answers concise, practical, and user-friendly. If unknown, say so clearly.',
        ].join(' '),
      },
      ...conversationMessages,
      { role: 'user', content: prompt },
    ], { maxTokens: 350, temperature: 0.5 });

    return responseText || 'Sorry, I could not generate a response right now.';
  } catch (error) {
    if (shouldUseLocalFallback(error)) {
      warnFallback('chat', error);
      return buildFallbackReply(message);
    }

    console.error('OpenAI Chat Error:', error);
    return buildFallbackReply(message);
  }
}