# Environment Setup Guide - LLM API Keys

This guide explains how to obtain API keys for the 4 LLM providers used by cjhirashi-agents.

---

## Required API Keys

The LLM Hybrid Router requires API keys for the following providers:

1. **Anthropic** (Claude 3.5 Sonnet)
2. **OpenAI** (GPT-4o)
3. **Google** (Gemini 2.0 Flash)
4. **DeepSeek** (DeepSeek Chat)

---

## 1. Anthropic (Claude 3.5 Sonnet)

### Get API Key

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to **API Keys** section
4. Click **Create Key**
5. Copy the API key (starts with `sk-ant-...`)

### Pricing

- **Input**: $3.00 per million tokens
- **Output**: $15.00 per million tokens
- **Context Window**: 200,000 tokens

### Add to `.env.local`

```env
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### Test Connection

```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

---

## 2. OpenAI (GPT-4o)

### Get API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to **API Keys** section
4. Click **Create new secret key**
5. Copy the API key (starts with `sk-...`)

### Pricing

- **Input**: $2.50 per million tokens
- **Output**: $10.00 per million tokens
- **Context Window**: 128,000 tokens

### Add to `.env.local`

```env
OPENAI_API_KEY=sk-...
```

### Test Connection

```bash
curl https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 100
  }'
```

---

## 3. Google (Gemini 2.0 Flash)

### Get API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with Google account
3. Click **Get API Key**
4. Create a new project (if needed)
5. Click **Create API Key**
6. Copy the API key

### Pricing

- **Input**: $0.15 per million tokens
- **Output**: $0.60 per million tokens
- **Context Window**: 1,000,000 tokens

### Add to `.env.local`

```env
GOOGLE_API_KEY=AIzaSy...
```

### Test Connection

```bash
curl https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=$GOOGLE_API_KEY \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{"parts": [{"text": "Hello!"}]}]
  }'
```

---

## 4. DeepSeek (DeepSeek Chat)

### Get API Key

1. Go to [DeepSeek Platform](https://platform.deepseek.com/)
2. Sign up or log in
3. Navigate to **API Keys** section
4. Click **Create API Key**
5. Copy the API key (starts with `sk-...`)

### Pricing

- **Input**: $0.14 per million tokens
- **Output**: $0.28 per million tokens
- **Context Window**: 64,000 tokens

### Add to `.env.local`

```env
DEEPSEEK_API_KEY=sk-...
```

### Test Connection

```bash
curl https://api.deepseek.com/v1/chat/completions \
  -H "Authorization: Bearer $DEEPSEEK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 100
  }'
```

---

## Complete `.env.local` Example

```env
# LLM API Keys
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=AIzaSy...
DEEPSEEK_API_KEY=sk-...
```

---

## Verification Script

After adding all API keys, run this verification script to test all connections:

```bash
npm run verify:api-keys
```

Expected output:
```
✅ Anthropic API: Connected
✅ OpenAI API: Connected
✅ Google API: Connected
✅ DeepSeek API: Connected

All API keys are valid and working!
```

---

## Cost Tracking

The LLM Router automatically tracks costs for each request. Costs are calculated based on:

- **Input tokens** × **Input cost per 1k tokens**
- **Output tokens** × **Output cost per 1k tokens**

Example cost breakdown:
```
Request: "Explain quantum computing" (500 input tokens)
Response: 1,000 output tokens

Using Claude 3.5 Sonnet:
- Input: 500 tokens × $0.003/1k = $0.0015
- Output: 1,000 tokens × $0.015/1k = $0.015
- Total: $0.0165
```

---

## Free Tier Limits

| Provider | Free Tier | Rate Limits |
|----------|-----------|-------------|
| **Anthropic** | None (pay-as-you-go) | 50 requests/min |
| **OpenAI** | $5 credit (first 3 months) | 60 requests/min |
| **Google** | Free up to 60 requests/min | 60 requests/min |
| **DeepSeek** | None (pay-as-you-go) | 20 requests/min |

---

## Troubleshooting

### Error: "Invalid API Key"

- Double-check the key is correctly copied (no extra spaces)
- Verify the key is active in the provider's console
- Check if the key has the correct permissions

### Error: "Rate limit exceeded"

- Wait before retrying
- Consider implementing request queuing
- Upgrade to higher tier if needed

### Error: "Insufficient quota"

- Add billing information to your account
- Check if free credits are exhausted
- Verify payment method is valid

---

## Security Best Practices

1. **Never commit** `.env.local` to Git
2. **Use environment variables** in production (Vercel, AWS, etc.)
3. **Rotate keys** regularly (every 3-6 months)
4. **Restrict key permissions** to only what's needed
5. **Monitor usage** to detect anomalies

---

## Next Steps

After setting up API keys:

1. Run tests: `npm run test:router`
2. Start development server: `npm run dev`
3. Test LLM routing: Make a request to `/api/v1/chat/send`

---

**Setup complete!** The LLM Hybrid Router is now ready to use.
