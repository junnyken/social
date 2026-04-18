// ============================================================
// Analytics Charts — Chart.js config factory (10 chart types)
// ============================================================

// ── Design tokens → Chart colors ─────────────────────────────
const getChartColors = () => {
  const style = getComputedStyle(document.documentElement);
  const g = v => style.getPropertyValue(v).trim();
  return {
    primary:   g('--color-primary')      || '#1e3a5f',
    accent:    g('--color-accent')       || '#38bdf8',
    success:   g('--color-success')      || '#10B981',
    warning:   g('--color-warning')      || '#F59E0B',
    error:     g('--color-error')        || '#EF4444',
    purple:    '#7C3AED',
    orange:    '#F97316',
    textMuted: g('--color-text-muted')   || '#7a7974',
    border:    g('--color-border')       || '#d4d1ca',
    surface:   g('--color-surface')      || '#f9f8f5',
    text:      g('--color-text')         || '#28251d'
  };
};

const PLATFORM_COLORS = {
  facebook:  '#1877F2',
  instagram: '#E4405F',
  twitter:   '#1DA1F2',
  linkedin:  '#0A66C2',
  tiktok:    '#010101',
  youtube:   '#FF0000'
};

// Shared default options
const baseOptions = () => {
  const c = getChartColors();
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: 'easeInOutQuart' },
    plugins: {
      legend: {
        labels: {
          color: c.textMuted,
          font: { size: 12 },
          boxWidth: 12, boxHeight: 12, padding: 16
        }
      },
      tooltip: {
        backgroundColor: c.surface,
        borderColor: c.border,
        borderWidth: 1,
        titleColor: c.text,
        bodyColor: c.textMuted,
        padding: 12,
        cornerRadius: 8,
        boxPadding: 4
      }
    },
    scales: {
      x: {
        grid: { color: `${c.border}80` },
        ticks: { color: c.textMuted, font: { size: 11 } }
      },
      y: {
        grid: { color: `${c.border}80` },
        ticks: { color: c.textMuted, font: { size: 11 } }
      }
    }
  };
};

// Active chart registry — destroy before recreate
const chartRegistry = new Map();

function createChart(canvasId, config) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  if (chartRegistry.has(canvasId)) {
    chartRegistry.get(canvasId).destroy();
  }

  const chart = new Chart(canvas, config);
  chartRegistry.set(canvasId, chart);
  return chart;
}

export function destroyChart(canvasId) {
  if (chartRegistry.has(canvasId)) {
    chartRegistry.get(canvasId).destroy();
    chartRegistry.delete(canvasId);
  }
}

export function destroyAllCharts() {
  chartRegistry.forEach(c => c.destroy());
  chartRegistry.clear();
}

// ── 1. Reach & Impressions Line Chart ────────────────────────
export function createReachChart(canvasId, reachSeries, impressionsSeries) {
  const c = getChartColors();
  const labels = reachSeries.map(d => {
    const dt = new Date(d.date);
    return `${dt.getDate()}/${dt.getMonth() + 1}`;
  });

  return createChart(canvasId, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Reach',
          data: reachSeries.map(d => d.value),
          borderColor: c.primary,
          backgroundColor: `${c.primary}18`,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 6,
          borderWidth: 2
        },
        {
          label: 'Impressions',
          data: impressionsSeries.map(d => d.value),
          borderColor: c.accent,
          backgroundColor: `${c.accent}10`,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 6,
          borderWidth: 2,
          borderDash: [5, 5]
        }
      ]
    },
    options: {
      ...baseOptions(),
      plugins: {
        ...baseOptions().plugins,
        tooltip: {
          ...baseOptions().plugins.tooltip,
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString('vi-VN')}`
          }
        }
      }
    }
  });
}

// ── 2. Follower Growth Chart (Bar + Line combo) ───────────────
export function createFollowerGrowthChart(canvasId, series) {
  const c = getChartColors();
  const labels = series.map(d => {
    const dt = new Date(d.date);
    return `${dt.getDate()}/${dt.getMonth() + 1}`;
  });
  const values = series.map(d => d.value);
  const deltas = values.map((v, i) => i === 0 ? 0 : v - values[i - 1]);

  return createChart(canvasId, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Followers mới',
          data: deltas,
          backgroundColor: deltas.map(v =>
            v >= 0 ? `${c.success}cc` : `${c.error}cc`
          ),
          borderRadius: 3,
          yAxisID: 'yDelta',
          order: 2
        },
        {
          label: 'Tổng followers',
          data: values,
          type: 'line',
          borderColor: c.primary,
          backgroundColor: 'transparent',
          tension: 0.4,
          pointRadius: 2,
          borderWidth: 2,
          yAxisID: 'yTotal',
          order: 1
        }
      ]
    },
    options: {
      ...baseOptions(),
      scales: {
        x: baseOptions().scales.x,
        yDelta: {
          type: 'linear', position: 'right',
          grid: { display: false },
          ticks: { color: c.textMuted, font: { size: 10 } }
        },
        yTotal: {
          type: 'linear', position: 'left',
          grid: baseOptions().scales.y.grid,
          ticks: { color: c.textMuted, font: { size: 10 } }
        }
      }
    }
  });
}

// ── 3. Engagement Rate Trend (Multi-line) ─────────────────────
export function createEngagementChart(canvasId, platforms, seriesMap) {
  const c = getChartColors();
  const firstKey = Object.keys(seriesMap)[0];
  const firstSeries = seriesMap[firstKey] || [];
  const labels = firstSeries.map(d => {
    const dt = new Date(d.date);
    return `${dt.getDate()}/${dt.getMonth() + 1}`;
  });

  return createChart(canvasId, {
    type: 'line',
    data: {
      labels,
      datasets: platforms.map(platform => ({
        label: platform.charAt(0).toUpperCase() + platform.slice(1),
        data: (seriesMap[platform] || []).map(d => d.value),
        borderColor: PLATFORM_COLORS[platform],
        backgroundColor: 'transparent',
        tension: 0.4,
        pointRadius: 3,
        borderWidth: 2
      }))
    },
    options: {
      ...baseOptions(),
      plugins: {
        ...baseOptions().plugins,
        tooltip: {
          ...baseOptions().plugins.tooltip,
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}%`
          }
        }
      },
      scales: {
        ...baseOptions().scales,
        y: {
          ...baseOptions().scales.y,
          ticks: {
            ...baseOptions().scales.y.ticks,
            callback: v => v + '%'
          }
        }
      }
    }
  });
}

// ── 4. Content Type Donut Chart ───────────────────────────────
export function createContentTypeChart(canvasId, data) {
  const c = getChartColors();
  const COLORS = [c.primary, c.accent, c.success, c.orange, c.warning, c.purple];

  const TYPE_LABELS = {
    image: '🖼️ Ảnh', video: '🎬 Video',
    carousel: '📑 Carousel', text: '💬 Text',
    link: '🔗 Link', story: '📖 Story',
    mobile: '📱 Mobile', desktop: '💻 Desktop', tablet: '📟 Tablet'
  };

  return createChart(canvasId, {
    type: 'doughnut',
    data: {
      labels: data.map(d => TYPE_LABELS[d.type] || d.type),
      datasets: [{
        data: data.map(d => d.count),
        backgroundColor: COLORS.slice(0, data.length),
        borderWidth: 2,
        borderColor: c.surface,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: c.textMuted,
            font: { size: 12 },
            padding: 12
          }
        },
        tooltip: {
          ...baseOptions().plugins.tooltip,
          callbacks: {
            label: ctx => {
              const d = data[ctx.dataIndex];
              const lines = [` ${d.count} bài`];
              if (d.avgER != null) lines.push(` ER trung bình: ${d.avgER}%`);
              if (d.reach != null) lines.push(` Reach: ${d.reach.toLocaleString('vi-VN')}`);
              return lines;
            }
          }
        }
      }
    }
  });
}

// ── 5. Audience Age/Gender Bar Chart ─────────────────────────
export function createAudienceChart(canvasId, ageGenderData) {
  const c = getChartColors();

  return createChart(canvasId, {
    type: 'bar',
    data: {
      labels: ageGenderData.map(d => d.group),
      datasets: [
        {
          label: 'Nam',
          data: ageGenderData.map(d => d.male),
          backgroundColor: `${PLATFORM_COLORS.facebook}cc`,
          borderRadius: 4
        },
        {
          label: 'Nữ',
          data: ageGenderData.map(d => d.female),
          backgroundColor: `${PLATFORM_COLORS.instagram}cc`,
          borderRadius: 4
        }
      ]
    },
    options: {
      ...baseOptions(),
      plugins: {
        ...baseOptions().plugins,
        tooltip: {
          ...baseOptions().plugins.tooltip,
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}%`
          }
        }
      },
      scales: {
        ...baseOptions().scales,
        x: { ...baseOptions().scales.x, stacked: false },
        y: {
          ...baseOptions().scales.y,
          ticks: {
            ...baseOptions().scales.y.ticks,
            callback: v => v + '%'
          }
        }
      }
    }
  });
}

// ── 6. Best Time Heatmap (Canvas custom draw) ────────────────
export function createHeatmap(canvasId, peakHoursData) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const c = getChartColors();

  const DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  const padding = { top: 20, right: 20, bottom: 36, left: 28 };
  const cellW = (canvas.width - padding.left - padding.right) / 24;
  const cellH = (canvas.height - padding.top - padding.bottom) / 7;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = c.surface;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Parse primary color to RGB
  const primaryHex = c.primary.replace('#', '');
  const pr = parseInt(primaryHex.slice(0, 2), 16) || 30;
  const pg = parseInt(primaryHex.slice(2, 4), 16) || 58;
  const pb = parseInt(primaryHex.slice(4, 6), 16) || 95;

  // Draw cells
  peakHoursData.forEach(({ day, hour, value }) => {
    const x = padding.left + hour * cellW;
    const y = padding.top + day * cellH;
    const alpha = value / 100;

    ctx.fillStyle = `rgba(${pr},${pg},${pb},${(0.05 + alpha * 0.9).toFixed(2)})`;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x + 1, y + 1, cellW - 2, cellH - 2, 3);
    } else {
      ctx.rect(x + 1, y + 1, cellW - 2, cellH - 2);
    }
    ctx.fill();

    if (value > 70) {
      ctx.fillStyle = value > 85 ? 'white' : `rgba(${pr},${pg},${pb},0.8)`;
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(value, x + cellW / 2, y + cellH / 2 + 3);
    }
  });

  // Day labels (Y axis)
  ctx.fillStyle = c.textMuted;
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'right';
  DAYS.forEach((day, i) => {
    ctx.fillText(day, padding.left - 4, padding.top + i * cellH + cellH / 2 + 4);
  });

  // Hour labels (X axis)
  ctx.textAlign = 'center';
  [0, 6, 12, 18].forEach(hour => {
    ctx.fillText(
      `${hour}h`,
      padding.left + hour * cellW + cellW / 2,
      canvas.height - padding.bottom + 16
    );
  });

  // Legend
  const legendX = canvas.width - padding.right - 80;
  const legendY = canvas.height - padding.bottom + 8;

  [0.1, 0.3, 0.5, 0.7, 0.9].forEach((alpha, i) => {
    ctx.fillStyle = `rgba(${pr},${pg},${pb},${alpha})`;
    ctx.fillRect(legendX + i * 16, legendY, 12, 10);
  });
  ctx.fillStyle = c.textMuted;
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Thấp', legendX, legendY + 20);
  ctx.textAlign = 'right';
  ctx.fillText('Cao', legendX + 82, legendY + 20);
}

// ── 7. Hashtag Bar Chart (Horizontal) ────────────────────────
export function createHashtagChart(canvasId, hashtagData) {
  const c = getChartColors();
  const top8 = hashtagData.slice(0, 8);

  return createChart(canvasId, {
    type: 'bar',
    data: {
      labels: top8.map(d => d.tag),
      datasets: [
        {
          label: 'Reach',
          data: top8.map(d => d.reach),
          backgroundColor: top8.map((_, i) =>
            `${c.primary}${Math.round(255 * (1 - i * 0.09)).toString(16).padStart(2, '0')}`
          ),
          borderRadius: 4,
          barPercentage: 0.7
        }
      ]
    },
    options: {
      ...baseOptions(),
      indexAxis: 'y',
      plugins: {
        ...baseOptions().plugins,
        legend: { display: false },
        tooltip: {
          ...baseOptions().plugins.tooltip,
          callbacks: {
            label: ctx => {
              const d = top8[ctx.dataIndex];
              return [
                ` Reach: ${d.reach.toLocaleString('vi-VN')}`,
                ` Avg ER: ${d.avgER}%`,
                ` Số bài: ${d.posts}`
              ];
            }
          }
        }
      },
      scales: {
        x: {
          ...baseOptions().scales.x,
          ticks: {
            ...baseOptions().scales.x.ticks,
            callback: v => v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v
          }
        },
        y: {
          ...baseOptions().scales.y,
          ticks: { color: c.text, font: { size: 12, weight: '600' } }
        }
      }
    }
  });
}

// ── 8. Competitor Comparison Chart ───────────────────────────
export function createCompetitorChart(canvasId, myData, competitors) {
  const c = getChartColors();
  const allEntities = [
    { label: 'Bạn', ...myData, color: c.primary },
    ...competitors.map((comp, i) => ({
      label: comp.name,
      ...comp.metrics,
      color: [c.accent, c.orange, c.purple, c.success][i % 4]
    }))
  ];

  return createChart(canvasId, {
    type: 'bar',
    data: {
      labels: ['Followers', 'Avg Reach', 'ER%', 'Posts/Week'],
      datasets: allEntities.map(entity => ({
        label: entity.label,
        data: [
          entity.followers / 1000,
          (entity.avgReach || entity.reach || 0) / 1000,
          parseFloat(entity.engagementRate || 0),
          entity.postsPerWeek || Math.round(entity.postsCount / 4) || 0
        ],
        backgroundColor: `${entity.color}cc`,
        borderColor: entity.color,
        borderWidth: 1,
        borderRadius: 4
      }))
    },
    options: {
      ...baseOptions(),
      scales: {
        x: baseOptions().scales.x,
        y: { ...baseOptions().scales.y }
      }
    }
  });
}

// ── 9. Platform Reach Stacked Bar ────────────────────────────
export function createPlatformStackedChart(canvasId, days, platformsData) {
  const labels = days.map(d => {
    const dt = new Date(d);
    return `${dt.getDate()}/${dt.getMonth() + 1}`;
  });

  return createChart(canvasId, {
    type: 'bar',
    data: {
      labels,
      datasets: Object.entries(platformsData).map(([platform, series]) => ({
        label: platform.charAt(0).toUpperCase() + platform.slice(1),
        data: series.map(d => d.value),
        backgroundColor: PLATFORM_COLORS[platform] + 'cc',
        borderColor: PLATFORM_COLORS[platform],
        borderWidth: 0,
        borderRadius: 2
      }))
    },
    options: {
      ...baseOptions(),
      scales: {
        x: { ...baseOptions().scales.x, stacked: true },
        y: {
          ...baseOptions().scales.y, stacked: true,
          ticks: {
            ...baseOptions().scales.y.ticks,
            callback: v => v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v
          }
        }
      }
    }
  });
}

// ── 10. Page Health Score Gauge (Radial) ─────────────────────
export function createHealthGauge(canvasId, score) {
  const c = getChartColors();
  const color = score >= 80 ? c.success
              : score >= 60 ? c.warning
              : c.error;

  return createChart(canvasId, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [score, 100 - score],
        backgroundColor: [color, `${c.border}60`],
        borderWidth: 0,
        circumference: 220,
        rotation: -110
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '78%',
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      }
    },
    plugins: [{
      id: 'gaugeText',
      afterDraw(chart) {
        const { ctx, chartArea: { top, bottom, left, right } } = chart;
        const cx = (left + right) / 2;
        const cy = (top + bottom) / 2 + 20;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = color;
        ctx.font = 'bold 32px sans-serif';
        ctx.fillText(score, cx, cy);

        ctx.fillStyle = c.textMuted;
        ctx.font = '12px sans-serif';
        ctx.fillText('/ 100', cx, cy + 22);
        ctx.restore();
      }
    }]
  });
}

export { PLATFORM_COLORS, getChartColors };
