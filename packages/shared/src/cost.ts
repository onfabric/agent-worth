import type { ModelPrice, SessionCost, TokenUsage, UsageStatus } from "./schemas";

const TOKENS_PER_MILLION = 1_000_000;

function roundUsd(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function componentCost(tokens: number | undefined, pricePerMillion: number): number {
  return ((tokens ?? 0) / TOKENS_PER_MILLION) * pricePerMillion;
}

export function hasNativeUsage(usage: TokenUsage | undefined): usage is TokenUsage {
  if (!usage) return false;
  return (
    usage.inputTokens > 0 ||
    usage.outputTokens > 0 ||
    usage.cachedInputTokens > 0 ||
    usage.cacheCreationInputTokens > 0 ||
    usage.reasoningOutputTokens > 0 ||
    (usage.totalTokens ?? 0) > 0
  );
}

export function calculateSessionCost(input: {
  usage?: TokenUsage | undefined;
  price?: ModelPrice | undefined;
  usageStatus?: UsageStatus | undefined;
}): SessionCost {
  const status: UsageStatus = input.usageStatus ?? (hasNativeUsage(input.usage) ? "native" : "missing");

  if (!input.usage || !input.price) {
    return {
      inputUsd: 0,
      outputUsd: 0,
      cachedInputUsd: 0,
      cacheCreationUsd: 0,
      reasoningOutputUsd: 0,
      totalUsd: 0,
      usageStatus: status
    };
  }

  const inputUsd = componentCost(input.usage.inputTokens, input.price.inputUsdPerMillion);
  const outputUsd = componentCost(input.usage.outputTokens, input.price.outputUsdPerMillion);
  const cachedInputUsd = componentCost(input.usage.cachedInputTokens, input.price.cachedInputUsdPerMillion);
  const cacheCreationUsd = componentCost(input.usage.cacheCreationInputTokens, input.price.cacheCreationUsdPerMillion);
  const reasoningOutputUsd = componentCost(
    input.usage.reasoningOutputTokens,
    input.price.reasoningOutputUsdPerMillion || input.price.outputUsdPerMillion
  );

  const totalUsd = inputUsd + outputUsd + cachedInputUsd + cacheCreationUsd + reasoningOutputUsd;

  return {
    inputUsd: roundUsd(inputUsd),
    outputUsd: roundUsd(outputUsd),
    cachedInputUsd: roundUsd(cachedInputUsd),
    cacheCreationUsd: roundUsd(cacheCreationUsd),
    reasoningOutputUsd: roundUsd(reasoningOutputUsd),
    totalUsd: roundUsd(totalUsd),
    usageStatus: status
  };
}

export function selectCurrentPrice(
  prices: ModelPrice[],
  provider: string,
  model: string,
  atIso: string
): ModelPrice | undefined {
  const at = Date.parse(atIso);
  return prices
    .filter((price) => price.provider === provider && price.model === model)
    .filter((price) => Date.parse(price.effectiveFrom) <= at)
    .sort((a, b) => Date.parse(b.effectiveFrom) - Date.parse(a.effectiveFrom))[0];
}
