import { describe, expect, test } from 'bun:test';
import { calculateSessionCost, selectCurrentPrice } from './cost';
import { syntheticModelPrices } from './fixtures';

function firstSyntheticPrice() {
  const price = syntheticModelPrices[0];
  if (!price) {
    throw new Error('Expected at least one synthetic model price fixture');
  }
  return price;
}

describe('cost calculation', () => {
  test('calculates token cost with cache and reasoning components', () => {
    const price = firstSyntheticPrice();
    const cost = calculateSessionCost({
      price,
      usage: {
        inputTokens: 1_000_000,
        outputTokens: 100_000,
        cachedInputTokens: 500_000,
        cacheCreationInputTokens: 10_000,
        reasoningOutputTokens: 25_000,
        totalTokens: 1_635_000,
      },
    });

    expect(cost.usageStatus).toBe('native');
    expect(cost.inputUsd).toBe(1.25);
    expect(cost.outputUsd).toBe(1);
    expect(cost.cachedInputUsd).toBe(0.0625);
    expect(cost.cacheCreationUsd).toBe(0.0125);
    expect(cost.reasoningOutputUsd).toBe(0.25);
    expect(cost.totalUsd).toBe(2.575);
  });

  test('marks sessions without native usage as missing', () => {
    const cost = calculateSessionCost({});
    expect(cost.usageStatus).toBe('missing');
    expect(cost.totalUsd).toBe(0);
  });

  test('selects the latest effective price', () => {
    const basePrice = firstSyntheticPrice();
    const price = selectCurrentPrice(
      [
        { ...basePrice, effectiveFrom: '2026-01-01T00:00:00.000Z', inputUsdPerMillion: 1 },
        { ...basePrice, effectiveFrom: '2026-03-01T00:00:00.000Z', inputUsdPerMillion: 2 },
      ],
      'openai',
      'gpt-5-codex',
      '2026-04-01T00:00:00.000Z',
    );

    expect(price?.inputUsdPerMillion).toBe(2);
  });
});
