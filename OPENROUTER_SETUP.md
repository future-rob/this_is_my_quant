# OpenRouter Setup Guide

The vision AI system has been successfully migrated from OpenAI to OpenRouter. OpenRouter provides access to multiple AI models through a unified API that's compatible with the OpenAI SDK.

## Benefits of OpenRouter

- **Cost Savings**: Often more cost-effective than direct OpenAI API usage
- **Model Variety**: Access to models from multiple providers (OpenAI, Anthropic, Google, etc.)
- **Automatic Fallbacks**: Built-in failover to alternative models
- **Unified API**: Compatible with existing OpenAI SDK code

## Setup Instructions

### 1. Get an OpenRouter API Key

1. Visit [OpenRouter.ai](https://openrouter.ai)
2. Create an account or sign in
3. Go to [API Keys](https://openrouter.ai/keys) 
4. Create a new API key
5. Copy your API key

### 2. Set Environment Variable

Replace your existing `OPENAI_API_KEY` with `OPENROUTER_API_KEY`:

```bash
# Remove old environment variable (if set)
unset OPENAI_API_KEY

# Set new OpenRouter API key
export OPENROUTER_API_KEY="your-openrouter-api-key-here"

# Add to your shell profile to persist
echo 'export OPENROUTER_API_KEY="your-openrouter-api-key-here"' >> ~/.zshrc
source ~/.zshrc
```

### 3. Model Format Changes

OpenRouter uses a specific model naming format:

| Old OpenAI Format | New OpenRouter Format |
|-------------------|----------------------|
| `gpt-4o` | `openai/gpt-4o` |
| `gpt-4o-mini` | `openai/gpt-4o-mini` |
| `gpt-4-turbo` | `openai/gpt-4-turbo` |

### 4. Alternative Models

OpenRouter gives you access to other providers too:

```bash
# Use Anthropic Claude models
npm run start-vision-ai -- --model anthropic/claude-3-5-sonnet-20241022

# Use Google Gemini models  
npm run start-vision-ai -- --model google/gemini-pro-1.5

# Use Meta Llama models
npm run start-vision-ai -- --model meta-llama/llama-3.2-90b-vision-instruct
```

## Changes Made

The following files were updated:

### `src/features/vision-analysis.ts`
- Updated `initializeOpenAI()` to use OpenRouter base URL and headers
- Updated all model references to OpenRouter format
- Updated cost calculations to include OpenRouter model names
- Added fallback support for legacy model names

### `src/vision-ai.ts`
- Updated help text to reference `OPENROUTER_API_KEY`
- Updated example commands to use OpenRouter model format
- Updated prerequisite checks for OpenRouter API key

## Testing the Migration

Run the vision AI analysis to test the setup:

```bash
# Test with default OpenRouter settings
npm run start-vision-ai

# Test with specific model
npm run start-vision-ai -- --model openai/gpt-4o-mini

# Test with alternative provider
npm run start-vision-ai -- --model anthropic/claude-3-5-sonnet-20241022
```

## Cost Comparison

OpenRouter often provides better pricing than direct API access:

- **OpenAI GPT-4o**: Similar pricing to OpenAI direct
- **OpenAI GPT-4o-mini**: Often cheaper than OpenAI direct
- **Alternative models**: Access to potentially cheaper alternatives

Check current pricing at [OpenRouter Models](https://openrouter.ai/models).

## Fallback Support

The system maintains backward compatibility:
- Legacy model names (without provider prefix) still work
- Cost calculations support both old and new formats
- Gradual migration path for existing configurations

## Troubleshooting

### API Key Issues
```bash
# Check if API key is set
echo $OPENROUTER_API_KEY

# Test API key with curl
curl -X GET "https://openrouter.ai/api/v1/models" \
  -H "Authorization: Bearer $OPENROUTER_API_KEY"
```

### Model Issues
- Ensure model names use the `provider/model` format
- Check [OpenRouter Models](https://openrouter.ai/models) for available models
- Some models may have different capabilities (vision, function calling, etc.)

### Rate Limits
- OpenRouter has its own rate limiting separate from provider limits
- Monitor usage in the OpenRouter dashboard
- Consider upgrading to higher tier plans for better limits

## Next Steps

1. Set up the `OPENROUTER_API_KEY` environment variable
2. Test the system with a simple analysis run
3. Explore alternative models for better cost/performance
4. Monitor costs and performance in the OpenRouter dashboard