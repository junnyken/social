/**
 * Posting Streaks — Gamification + Consistency tracking
 * Reward users untuk posting consistently
 */
import { getStreaks } from './scheduler-store.js';
import { getHistory } from './scheduler-store.js';

// ── Streaks Achievements ──────────────────────────────────────
export const STREAK_ACHIEVEMENTS = [
  { days: 3,  title: '🔥 Starter',      badge: '🔥',  desc: 'Post 3 ngày liên tiếp' },
  { days: 7,  title: '🏆 Week Warrior',   badge: '🏆', desc: 'Post 7 ngày liên tiếp' },
  { days: 14, title: '👑 Fortnight King', badge: '👑', desc: 'Post 14 ngày liên tiếp' },
  { days: 30, title: '💎 Month Master',   badge: '💎', desc: 'Post 30 ngày liên tiếp' },
  { days: 60, title: '⭐ Unstoppable',    badge: '⭐', desc: 'Post 60 ngày liên tiếp' },
  { days: 100, title: '🎯 Century',      badge: '🎯', desc: 'Post 100 ngày liên tiếp' }
];

// ── Get Current Streak ────────────────────────────────────────
export function getCurrentStreakData() {
  const streaks = getStreaks();

  const unlockedAchievements = STREAK_ACHIEVEMENTS.filter(a => streaks.currentStreak >= a.days);
  const nextAchievement = STREAK_ACHIEVEMENTS.find(a => a.days > streaks.currentStreak);

  return {
    currentStreak: streaks.currentStreak,
    bestStreak: streaks.bestStreak,
    daysUntilNextAchievement: nextAchievement ? nextAchievement.days - streaks.currentStreak : 0,
    nextAchievement,
    unlockedAchievements,
    consistencyScore: streaks.consistencyScore,
    postsThisMonth: streaks.postsThisMonth,
    lastPostDate: streaks.lastPostDate
  };
}

// ── Streak Statistics ─────────────────────────────────────────
export function getStreakStats() {
  const history = getHistory(null, 365);
  const streakData = getCurrentStreakData();

  // Posts per day of week
  const postsByDOW = [0, 0, 0, 0, 0, 0, 0];
  history.forEach(post => {
    const dow = new Date(post.publishedAt).getDay();
    if (dow >= 0 && dow <= 6) {
      postsByDOW[dow]++;
    }
  });

  // Consistency this month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthPosts = history.filter(p => new Date(p.publishedAt) >= monthStart);

  return {
    currentStreak: streakData.currentStreak,
    bestStreak: streakData.bestStreak,
    totalPosts: history.length,
    thisMonthCount: thisMonthPosts.length,
    lastSevenDays: history.slice(0, 7).length,
    postsByDOW: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                  .map((day, i) => ({ day, posts: postsByDOW[i] })),
    consistency: {
      score: streakData.consistencyScore,
      level: streakData.consistencyScore >= 80 ? 'Excellent'
           : streakData.consistencyScore >= 60 ? 'Good'
           : streakData.consistencyScore >= 40 ? 'Fair'
           : 'Needs Improvement'
    }
  };
}

// ── Streak Recommendation ─────────────────────────────────────
export function getStreakRecommendation() {
  const stats = getStreakStats();
  const streakData = getCurrentStreakData();

  const recommendations = [];

  if (streakData.currentStreak === 0) {
    recommendations.push('🚀 Bắt đầu streak mới — post bài hôm nay!');
  } else if (streakData.currentStreak < 7) {
    recommendations.push(`✨ ${streakData.currentStreak} ngày streak — gần đó rồi, maintain 7 ngày!`);
  } else if (streakData.currentStreak % 7 === 0) {
    recommendations.push('🎉 Milestone! Keep going!');
  }

  const lessActiveDays = stats.postsByDOW
    .filter(d => d.posts < 3)
    .map(d => d.day);

  if (lessActiveDays.length > 0) {
    recommendations.push(`📌 Ít post vào ${lessActiveDays.join(', ')} — cân nhắc tăng đây!`);
  }

  if (stats.consistency.score < 50) {
    recommendations.push('💪 Consistency score thấp — cần post đều hơn');
  }

  return {
    streak: streakData.currentStreak,
    recommendations,
    nextReward: streakData.nextAchievement
  };
}

// ── Predict when streak will break ────────────────────────────
export function predictStreakBreak() {
  const history = getHistory(null, 30);
  if (history.length < 7) return null;

  // Analyze gap pattern
  const gaps = [];
  for (let i = 0; i < history.length - 1; i++) {
    const gap = (new Date(history[i].publishedAt) - new Date(history[i+1].publishedAt)) / (1000 * 60 * 60 * 24);
    gaps.push(gap);
  }

  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const lastPostDate = new Date(history[0].publishedAt);
  const breakDate = new Date(lastPostDate.getTime() + avgGap * 24 * 60 * 60 * 1000 + 1 * 24 * 60 * 60 * 1000);

  return {
    avgGapDays: avgGap.toFixed(1),
    estimatedBreakDate: breakDate.toISOString(),
    daysUntilBreak: Math.round((breakDate - new Date()) / (1000 * 60 * 60 * 24))
  };
}
