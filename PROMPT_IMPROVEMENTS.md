# Vision AI Prompt Improvements

## Backtest Results Analysis (October 10, 2025)

### Performance Issues Identified

#### Claude Sonnet 4.5 Results:
- **Overall Accuracy**: 50%
- **Bullish Patterns**: 0% accuracy (0/2 correct)
- **Bearish Patterns**: 100% accuracy (3/3 correct)
- **Neutral Patterns**: 0% accuracy (0/1 correct)

#### Grok 4 Fast Results:
- **Overall Accuracy**: 50%
- **Bullish Patterns**: 0% accuracy (0/2 correct)
- **Bearish Patterns**: 100% accuracy (3/3 correct)
- **Neutral Patterns**: 0% accuracy (0/1 correct)

### Root Cause Analysis

**Major Issue**: Strong bearish bias in both models
- 5 out of 6 predictions were bearish
- Models misinterpreted bullish reversal setups as bearish continuation
- Models confused consolidation patterns with bearish moves
- Recent price action weighted too heavily vs. setup context

### Specific Failure Patterns

1. **Bullish Breakout** (Expected: bullish)
   - Claude: Predicted "sideways" (closer, but missed the setup)
   - Grok: Predicted "bearish" (saw descending trendline, ignored setup)
   - **Issue**: BB squeeze interpreted as indecision instead of breakout setup

2. **Bullish Reversal** (Expected: bullish)
   - Both: Predicted "bearish"
   - **Issue**: Oversold conditions + recent decline → continued bearish (wrong)
   - **Missing**: Recognition of bullish divergence and reversal patterns

3. **Neutral Consolidation** (Expected: neutral)
   - Both: Predicted "bearish"
   - **Issue**: Failed to distinguish range-bound consolidation from directional move

## Prompt Improvements Implemented

### 1. Critical Analysis Rules
Added explicit rules at the start of the prompt:

```
CRITICAL ANALYSIS RULES:
1. Look at PRICE STRUCTURE first - identify if price is making higher highs/higher lows (bullish), 
   lower highs/lower lows (bearish), or range-bound (sideways/neutral)
2. Distinguish between CURRENT TREND vs RECENT MOVE - a chart can be in a downtrend 
   but setting up for a bullish reversal
3. Bollinger Band SQUEEZE = consolidation/sideways (NOT directional), expansion = directional move
4. Oversold + bullish divergence = potential bullish reversal (NOT continuation bearish)
5. "Sideways" means consolidation/range - only use when price is clearly range-bound 
   within tight boundaries
6. "Neutral" means no clear directional bias - mixed signals across indicators
7. Consider the SETUP CONTEXT - is this a breakout, reversal, continuation, or consolidation pattern?
```

**Rationale**: Models were applying simplistic logic ("price down = bearish"). These rules force consideration of market structure and setup context.

### 2. Enhanced Analysis Structure

**Added:**
- **Price Structure** (new) - Identify higher-timeframe trend vs current phase
- **Setup Type** (new) - Classify as reversal, continuation, breakout, or consolidation
- More specific indicator analysis guidelines (divergences, relative volume, position in bands)

**Improved:**
- Volume: "relative to recent bars" (context matters)
- Bollinger Bands: Explicit definitions (squeeze=consolidation, expansion=trending)
- Momentum: "look for divergences and reversals, not just current position"

### 3. Context Emphasis

Added explicit reminders:
- "Consider the SETUP CONTEXT"
- "IMPORTANT: A chart showing oversold conditions after a decline may be setting up for a BULLISH reversal"
- "Consider the full context"

### 4. Setup Classification

New requirement to identify setup type:
- Reversal setup
- Continuation
- Breakout
- Consolidation

This forces the model to think about market structure, not just recent price direction.

## Expected Improvements

### Bullish Pattern Recognition
- **Before**: 0% accuracy - missed all bullish setups
- **Target**: 60-80% accuracy
- **Mechanism**: Explicit rules about oversold reversals, divergences, and BB squeezes

### Neutral/Sideways Recognition
- **Before**: 0% accuracy - called consolidation "bearish"
- **Target**: 70%+ accuracy
- **Mechanism**: Clear definitions of sideways (range-bound) vs neutral (mixed signals)

### Reduced Bearish Bias
- **Before**: 83% of predictions were bearish (5/6)
- **Target**: More balanced distribution matching actual market conditions
- **Mechanism**: Price structure analysis and setup type classification

## Testing Recommendations

### Next Steps:
1. Run new backtest with updated prompt
2. Compare results:
   - Overall accuracy improvement
   - Bullish pattern accuracy (target: >60%)
   - Neutral pattern accuracy (target: >70%)
   - Distribution balance (should see more variety in predictions)

### Success Metrics:
- Overall accuracy: >70% (from 50%)
- Bullish accuracy: >60% (from 0%)
- Neutral accuracy: >70% (from 0%)
- Bearish accuracy: maintain >80% (was 100%)
- Prediction distribution: More balanced (not 80%+ bearish)

### A/B Testing:
Consider running both old and new prompts on the same dataset to quantify improvement.

## Technical Details

### File Modified:
`src/features/vision-analysis.ts`

### Function:
`getChartAnalysisPrompt(timeframe: string): string`

### Lines Changed:
~407-428 (prompt content)

### Backward Compatibility:
✅ JSON response format unchanged - no code changes needed elsewhere

## Notes for Future Improvements

If accuracy remains <70% after this iteration:

1. **Add Examples**: Include 2-3 annotated chart examples in the prompt
2. **Explicit Checklist**: "Before deciding bearish, verify: [ ] No bullish divergence [ ] Not oversold [ ] No reversal pattern"
3. **Confidence Calibration**: Require lower confidence scores for counter-trend calls
4. **Multi-Pass Analysis**: First pass for structure, second pass for direction
5. **Model Comparison**: Test different models (GPT-4o, Claude Opus, etc.)

## Conclusion

The improved prompt addresses the core issue: **models were focusing on recent price action (bearish) instead of setup context (potential reversal/consolidation)**. By explicitly instructing the model to consider price structure, setup type, and reversal patterns, we should see significant improvement in identifying bullish and neutral patterns while maintaining strong bearish pattern recognition.
