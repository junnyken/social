/**
 * A/B Test Optimizer — Automatic A/B testing & winner detection
 */

let abTests = [];

export function createABTest(testData) {
  const test = {
    id: crypto.randomUUID(),
    postId: testData.postId,
    testType: testData.testType,
    variableA: {
      ...testData.variableA,
      performance: { impressions: 0, clicks: 0, likes: 0, comments: 0, shares: 0 }
    },
    variableB: {
      ...testData.variableB,
      performance: { impressions: 0, clicks: 0, likes: 0, comments: 0, shares: 0 }
    },
    status: 'running',
    startDate: new Date().toISOString(),
    endDate: null,
    sampleSize: testData.sampleSize || 1000,
    winnerThreshold: 0.85,
    splitPercentage: 50
  };
  abTests.push(test);
  return test;
}

export function recordABTestMetric(testId, variant, metric, value) {
  const test = abTests.find(t => t.id === testId);
  if (!test) return null;
  const variantData = variant === 'A' ? test.variableA : test.variableB;
  if (variantData.performance[metric] !== undefined) {
    variantData.performance[metric] += value;
  }
  return test;
}

export function analyzeABTest(testId) {
  const test = abTests.find(t => t.id === testId);
  if (!test) return null;

  const perfA = test.variableA.performance;
  const perfB = test.variableB.performance;
  const erA = perfA.clicks / Math.max(1, perfA.impressions);
  const erB = perfB.clicks / Math.max(1, perfB.impressions);
  const uplift = ((erB - erA) / Math.max(0.001, erA) * 100);
  const confidence = calculateSignificance(test);

  let winner = null;
  let recommendation = '';

  if (confidence > test.winnerThreshold) {
    winner = erB > erA ? 'B' : 'A';
    recommendation = `Variant ${winner} is the clear winner (${(confidence * 100).toFixed(1)}% confidence, +${Math.abs(uplift).toFixed(1)}% lift)`;
  } else if (confidence > 0.7) {
    winner = erB > erA ? 'B' : 'A';
    recommendation = `Variant ${winner} is trending better, but needs more data (${(confidence * 100).toFixed(1)}% confidence)`;
  } else {
    recommendation = 'Not enough data yet. Continue the test.';
  }

  return {
    testId, testType: test.testType,
    variableA: test.variableA.value,
    variableB: test.variableB.value,
    engagementRateA: (erA * 100).toFixed(2) + '%',
    engagementRateB: (erB * 100).toFixed(2) + '%',
    uplift: uplift.toFixed(1) + '%',
    winner,
    confidence: (confidence * 100).toFixed(1) + '%',
    recommendation,
    metricsA: perfA, metricsB: perfB
  };
}

export function getABTestRecommendations() {
  const recommendations = [];
  abTests.filter(t => t.status === 'running').forEach(test => {
    const analysis = analyzeABTest(test.id);
    if (analysis.winner && parseFloat(analysis.confidence) > 85) {
      recommendations.push({
        type: 'ab_test_winner', priority: 'high',
        title: `🏆 A/B Test Winner: ${test.testType}`,
        message: analysis.recommendation,
        action: `Apply variant ${analysis.winner}`,
        expectedLift: analysis.uplift
      });
    } else if (parseFloat(analysis.confidence) > 70) {
      recommendations.push({
        type: 'ab_test_trending', priority: 'medium',
        title: `📊 A/B Test Trending: ${test.testType}`,
        message: analysis.recommendation,
        action: 'Continue monitoring'
      });
    }
  });
  return recommendations;
}

export function autoApplyWinner(testId) {
  const test = abTests.find(t => t.id === testId);
  if (!test) return { error: 'Test not found' };
  const analysis = analyzeABTest(testId);
  if (!analysis.winner || parseFloat(analysis.confidence) < test.winnerThreshold * 100) {
    return { error: 'Not enough confidence to apply winner' };
  }
  test.status = 'completed';
  test.endDate = new Date().toISOString();
  test.winner = analysis.winner;
  return { success: true, message: `Applied variant ${analysis.winner}. Expected lift: ${analysis.uplift}` };
}

function calculateSignificance(test) {
  const perfA = test.variableA.performance;
  const perfB = test.variableB.performance;
  const impressionsA = Math.max(1, perfA.impressions);
  const impressionsB = Math.max(1, perfB.impressions);
  const pA = perfA.clicks / impressionsA;
  const pB = perfB.clicks / impressionsB;
  const p = (perfA.clicks + perfB.clicks) / (impressionsA + impressionsB);
  const seNum = p * (1 - p) * (1 / impressionsA + 1 / impressionsB);
  const se = Math.sqrt(Math.max(0.0001, seNum));
  const z = Math.abs((pA - pB) / se);
  return Math.min(1, z / 2.58);
}
