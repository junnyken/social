// ============================================================
// Calendar Engine — Date/grid generation logic
// ============================================================

export function getMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const cells = [];

  // Empty cells before day 1
  for (let i = 0; i < firstDay; i++) {
    cells.push({ type: 'empty', day: 0, date: null });
  }

  // Day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    cells.push({
      type: 'day',
      day,
      date: date.toISOString().split('T')[0],
      isToday: date.toDateString() === today.toDateString(),
      isPast: date < today && date.toDateString() !== today.toDateString()
    });
  }

  return cells;
}

export function getWeekDays(viewDate) {
  const startOfWeek = new Date(viewDate);
  const dayOfWeek = startOfWeek.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  startOfWeek.setDate(startOfWeek.getDate() + diff);

  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    return {
      date: d.toISOString().split('T')[0],
      dayNum: d.getDate(),
      dayName: d.toLocaleDateString('vi-VN', { weekday: 'short' }),
      isToday: d.toDateString() === today.toDateString(),
      full: d
    };
  });
}

export function getHoursRange(start = 6, end = 22) {
  return Array.from({ length: end - start }, (_, i) => start + i);
}

export function formatMonthTitle(date) {
  return date.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
}

export function formatWeekTitle(viewDate) {
  const days = getWeekDays(viewDate);
  const start = days[0].full;
  const end = days[6].full;
  return `${start.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} — ${end.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
}
