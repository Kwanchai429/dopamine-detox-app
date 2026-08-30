import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  CalendarRange,
  Flame,
  Pencil,
  Plus,
  Target,
  TrendingUp,
  Trash2,
  Wallet,
  Zap,
} from 'lucide-react'
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
} from 'firebase/firestore'
import { db } from './firebase'

const defaultActivities = [
  {
    id: 'pornography',
    name: 'Pornography / Adult Content',
    points: 80,
    category: 'HIGH RISK',
  },
  {
    id: 'sexual-fantasies',
    name: 'Sexual Fantasies / Edging',
    points: 50,
    category: 'HIGH RISK',
  },
  {
    id: 'gaming-competitive',
    name: 'Gaming (MOBA / Competitive)',
    points: 40,
    category: 'HIGH RISK',
  },
  {
    id: 'added-sugar',
    name: 'Added Sugar (> 20g)',
    points: 30,
    category: 'TRIGGER',
  },
  {
    id: 'binge-series',
    name: 'Binge Series / Movies',
    points: 30,
    category: 'TRIGGER',
  },
  {
    id: 'social-media',
    name: 'Social Media Scrolling',
    points: 20,
    category: 'TRIGGER',
  },
  {
    id: 'shopping-junk-food',
    name: 'Shopping / Junk Food Craving',
    points: 15,
    category: 'TRIGGER',
  },
]

const todayKey = () => new Date().toISOString().slice(0, 10)
const dateKeyFromDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const formatSelectedDate = (dateKey) => {
  const value = dateKey ? new Date(`${dateKey}T00:00:00`) : new Date()
  return value.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
const getSettingsDoc = () => doc(db, 'dopamine_settings', 'app_settings')
const getDayDoc = (dateKey) => doc(db, 'dopamine_logs', dateKey)

const buildMonthGrid = (year, monthIndex) => {
  const firstDayOfMonth = new Date(year, monthIndex, 1)
  const firstWeekday = (firstDayOfMonth.getDay() + 6) % 7
  const prevMonthDays = new Date(year, monthIndex, 0).getDate()
  const totalDays = new Date(year, monthIndex + 1, 0).getDate()
  const cells = []

  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push({
      date: new Date(year, monthIndex - 1, prevMonthDays - firstWeekday + i + 1),
      isCurrentMonth: false,
    })
  }

  for (let day = 1; day <= totalDays; day += 1) {
    cells.push({
      date: new Date(year, monthIndex, day),
      isCurrentMonth: true,
    })
  }

  let nextDay = 1
  while (cells.length % 7 !== 0) {
    cells.push({
      date: new Date(year, monthIndex + 1, nextDay),
      isCurrentMonth: false,
    })
    nextDay += 1
  }

  return cells
}

const persistSettings = async (nextBudget, nextActivities) => {
  await setDoc(
    getSettingsDoc(),
    {
      budget: Number(nextBudget) || 100,
      presetActivities: nextActivities,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  )
}

const persistDayRecord = async (dateKey, nextRecord) => {
  const ref = getDayDoc(dateKey)

  if (!nextRecord || !nextRecord.items?.length) {
    await deleteDoc(ref).catch(() => {})
    return
  }

  await setDoc(
    ref,
    {
      dateKey,
      items: nextRecord.items,
      total: nextRecord.total,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  )
}

function StatCard({ icon: Icon, label, value, hint, tone = 'sage' }) {
  const toneMap = {
    sage: 'from-[#e3ebe3] to-[#f7f9f7] text-[#4d6b4d] ring-[#bfd2bf]',
    purple: 'from-[#efe7ff] to-[#f8f4ff] text-[#5d4d7a] ring-[#d7c9f0]',
    emerald: 'from-[#eaf7ee] to-[#f8fdf9] text-[#3b6a4a] ring-[#cfe7d4]',
    amber: 'from-[#fef2d8] to-[#fffaf1] text-[#7d5d2e] ring-[#f1d6a3]',
    rose: 'from-[#fde8e4] to-[#fff8f6] text-[#8d5647] ring-[#f0c2b7]',
  }

  return (
    <div
      className={`rounded-[24px] border border-[#e7ece6] bg-gradient-to-br ${toneMap[tone]} p-4 shadow-[0_18px_40px_rgba(116,147,115,0.08)] ring-1 backdrop-blur-xl`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
          <p className="mt-3 text-2xl font-semibold text-slate-800">{value}</p>
        </div>
        <div className="rounded-xl border border-[#dfe9df] bg-white/70 p-2 text-[#739373]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-600">{hint}</p>
    </div>
  )
}

function Header() {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  return (
    <header className="relative overflow-hidden rounded-[28px] border border-[#e7ece6] bg-white/80 p-5 shadow-[0_12px_35px_rgba(116,147,115,0.08)] backdrop-blur-xl">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 22% 22%, rgba(253, 224, 71, 0.38), rgba(253, 224, 71, 0.18) 15%, rgba(255,255,255,0.05) 30%, transparent 54%), linear-gradient(115deg, rgba(255,255,255,0.18), rgba(255,255,255,0.05) 32%, rgba(253, 224, 71, 0.12) 58%, transparent 78%)',
        }}
      />

      <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-[#739373]">dopamine detox</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-800 md:text-4xl">Daily Control Dashboard</h1>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-[#dfe9df] bg-[#f2f7f2]/90 px-4 py-3 text-[#4d6b4d] shadow-sm">
          <CalendarRange className="h-5 w-5 text-[#739373]" />
          <span className="text-sm font-medium">{currentDate}</span>
        </div>
      </div>
    </header>
  )
}

function MonthlyCalendar({ dailyEntries, budget, selectedDate, visibleMonth, onSelectDate, onMonthChange }) {
  const monthLabel = visibleMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
  const grid = useMemo(
    () => buildMonthGrid(visibleMonth.getFullYear(), visibleMonth.getMonth()),
    [visibleMonth],
  )

  const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const dayColor = (total, dateKey) => {
    const isSelected = selectedDate === dateKey
    if (isSelected) {
      return 'border border-[#9bb89c] bg-[#e8f4e7] text-[#234e2b] shadow-[inset_0_0_0_1px_rgba(115,147,115,0.35)]'
    }
    if (total === 0) {
      return 'border border-[#edf2ed] bg-[#f7faf7] text-slate-500'
    }

    const warningThreshold = budget * 0.6
    if (total >= warningThreshold && total < budget) {
      return 'border border-[#f7d4a3] bg-[#ffedd5] text-[#8a5a24]'
    }
    if (total >= budget) {
      return 'border border-[#f0b9b3] bg-[#fee2e2] text-[#8a2d2d]'
    }

    return 'border border-[#cfe2cf] bg-[#eaf3ea] text-[#335a39]'
  }

  return (
    <section className="rounded-[28px] border border-[#e7ece6] bg-white/80 p-5 shadow-[0_18px_40px_rgba(116,147,115,0.12)] backdrop-blur-xl">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => onMonthChange(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#dfe9df] bg-[#f5faf5] text-xl text-[#4d6b4d] transition hover:bg-[#edf6ee]"
          >
            &lt;
          </button>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[#739373]">Monthly overview</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-800">{monthLabel}</h2>
          </div>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => onMonthChange(1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#dfe9df] bg-[#f5faf5] text-xl text-[#4d6b4d] transition hover:bg-[#edf6ee]"
          >
            &gt;
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onMonthChange(0, true)}
            className="rounded-full border border-[#bfd2bf] bg-[#edf6ee] px-3 py-1.5 text-sm text-[#4d6b4d] transition hover:bg-[#e3ebe3]"
          >
            Today
          </button>
          <div className="rounded-full border border-[#bfd2bf] bg-[#edf6ee] px-3 py-1.5 text-sm text-[#4d6b4d]">
            Heatmap view
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-7 gap-2 text-center text-xs uppercase tracking-[0.18em] text-slate-500">
        {weekdayLabels.map((day) => (
          <div key={day} className="py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {grid.map((cell, index) => {
          const dateKey = dateKeyFromDate(cell.date)
          const total = dailyEntries[dateKey]?.total ?? 0

          return (
            <button
              key={`${dateKey}-${index}`}
              type="button"
              onClick={() => {
                onSelectDate(dateKey)
                if (!cell.isCurrentMonth) {
                  onMonthChange(0, false, cell.date)
                }
              }}
              className={`flex min-h-16 flex-col justify-between rounded-xl p-2 text-left transition hover:scale-[1.01] ${
                cell.isCurrentMonth ? dayColor(total, dateKey) : 'border border-[#edf2ed] bg-[#f5faf5] text-slate-400'
              }`}
            >
              <span className="text-sm font-medium">{cell.date.getDate()}</span>
              <span className="text-[10px] opacity-90">{total || '0'}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function App() {
  const [budget, setBudget] = useState(100)
  const [dailyEntries, setDailyEntries] = useState({})
  const [presetActivities, setPresetActivities] = useState(defaultActivities)
  const [selectedDate, setSelectedDate] = useState(() => todayKey())
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [customName, setCustomName] = useState('')
  const [customPoints, setCustomPoints] = useState(10)
  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState({ name: '', points: 0, category: 'CUSTOM' })
  const [isAlertDismissed, setIsAlertDismissed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const settingsRef = getSettingsDoc()
    const logsRef = collection(db, 'dopamine_logs')

    const unsubscribeSettings = onSnapshot(
      settingsRef,
      async (snapshot) => {
        if (!snapshot.exists()) {
          await setDoc(settingsRef, { budget: 100, presetActivities: defaultActivities }, { merge: true })
          return
        }

        const data = snapshot.data() ?? {}
        setBudget(Number(data.budget) || 100)
        setPresetActivities(Array.isArray(data.presetActivities) && data.presetActivities.length ? data.presetActivities : defaultActivities)
      },
      (error) => {
        console.error('Failed to load settings:', error)
        setBudget(100)
        setPresetActivities(defaultActivities)
      },
    )

    const unsubscribeLogs = onSnapshot(
      logsRef,
      (snapshot) => {
        const nextEntries = {}

        snapshot.forEach((document) => {
          const data = document.data() ?? {}
          const items = Array.isArray(data.items) ? data.items : []
          nextEntries[document.id] = {
            items,
            total: Number(data.total) || items.reduce((sum, item) => sum + Number(item.points || 0), 0),
          }
        })

        setDailyEntries(nextEntries)
        setIsLoading(false)
      },
      (error) => {
        console.error('Failed to load daily logs:', error)
        setDailyEntries({})
        setIsLoading(false)
      },
    )

    return () => {
      unsubscribeSettings()
      unsubscribeLogs()
    }
  }, [])

  const today = todayKey()
  const isToday = selectedDate === today
  const selectedDateRecord = dailyEntries[selectedDate] ?? { items: [], total: 0 }
  const warningThreshold = 60
  const progressPercent = Math.min((selectedDateRecord.total / Math.max(budget, 1)) * 100, 100)
  const isWarning = selectedDateRecord.total >= warningThreshold
  const hasExceeded = selectedDateRecord.total > budget
  const overLimit = Math.max(0, selectedDateRecord.total - budget)

  useEffect(() => {
    if (selectedDateRecord.total < warningThreshold) {
      setIsAlertDismissed(false)
    }
  }, [selectedDateRecord.total])

  const addActivity = async (activity) => {
    if (!isToday) return

    const existing = dailyEntries[selectedDate] ?? { items: [], total: 0 }
    const item = {
      id: `${activity.id}-${Date.now()}-${Math.random()}`,
      activityId: activity.id,
      name: activity.name,
      points: Number(activity.points) || 0,
      createdAt: new Date().toISOString(),
    }

    const nextRecord = {
      items: [...existing.items, item],
      total: existing.total + item.points,
    }

    await persistDayRecord(selectedDate, nextRecord)
  }

  const removeLatestActivity = async (activityId) => {
    if (!isToday) return

    const current = dailyEntries[selectedDate]
    if (!current) return

    const lastIndex = [...current.items].reverse().findIndex((item) => item.activityId === activityId)
    if (lastIndex === -1) return

    const targetIndex = current.items.length - 1 - lastIndex
    const removedItem = current.items[targetIndex]
    const nextItems = current.items.filter((item) => item.id !== removedItem.id)
    const nextRecord = nextItems.length
      ? { items: nextItems, total: nextItems.reduce((sum, item) => sum + Number(item.points || 0), 0) }
      : null

    await persistDayRecord(selectedDate, nextRecord)
  }

  const removeEntry = async (id) => {
    if (!isToday) return

    const current = dailyEntries[selectedDate]
    if (!current) return

    const nextItems = current.items.filter((item) => item.id !== id)
    const nextRecord = nextItems.length
      ? { items: nextItems, total: nextItems.reduce((sum, item) => sum + Number(item.points || 0), 0) }
      : null

    await persistDayRecord(selectedDate, nextRecord)
  }

  const resetToday = async () => {
    if (!isToday) return
    await deleteDoc(getDayDoc(selectedDate)).catch(() => {})
  }

  const startEditActivity = (activity) => {
    setEditingId(activity.id)
    setEditDraft({
      name: activity.name,
      points: activity.points,
      category: activity.category,
    })
  }

  const saveEditActivity = async (activityId) => {
    if (!isToday) return

    const nextPoints = Number(editDraft.points) || 1
    const trimmedName = editDraft.name.trim()

    if (!trimmedName) return

    const nextActivities = presetActivities.map((activity) =>
      activity.id === activityId
        ? {
            ...activity,
            name: trimmedName,
            points: nextPoints,
            category: editDraft.category,
          }
        : activity,
    )

    setPresetActivities(nextActivities)
    await persistSettings(budget, nextActivities)

    const nextDailyEntries = { ...dailyEntries }
    await Promise.all(
      Object.keys(nextDailyEntries).map(async (dayKey) => {
        const record = nextDailyEntries[dayKey]
        if (!record?.items?.length) return

        const updatedItems = record.items.map((item) =>
          item.activityId === activityId
            ? { ...item, name: trimmedName, points: nextPoints, category: editDraft.category }
            : item,
        )

        const nextRecord = {
          items: updatedItems,
          total: updatedItems.reduce((sum, item) => sum + Number(item.points || 0), 0),
        }

        await persistDayRecord(dayKey, nextRecord)
      }),
    )

    setEditingId(null)
  }

  const deleteActivity = async (activityId) => {
    if (!isToday) return

    const nextActivities = presetActivities.filter((activity) => activity.id !== activityId)
    setPresetActivities(nextActivities)
    await persistSettings(budget, nextActivities)

    await Promise.all(
      Object.keys(dailyEntries).map(async (dayKey) => {
        const record = dailyEntries[dayKey]
        if (!record?.items?.length) return

        const filteredItems = record.items.filter((item) => item.activityId !== activityId)
        const nextRecord = filteredItems.length
          ? { items: filteredItems, total: filteredItems.reduce((sum, item) => sum + Number(item.points || 0), 0) }
          : null

        await persistDayRecord(dayKey, nextRecord)
      }),
    )

    if (editingId === activityId) {
      setEditingId(null)
    }
  }

  const addCustomActivity = async (event) => {
    if (!isToday) return

    event.preventDefault()
    const trimmedName = customName.trim()
    const points = Number(customPoints)

    if (!trimmedName || points <= 0) {
      return
    }

    const newActivity = {
      id: `custom-${Date.now()}`,
      name: trimmedName,
      points,
      category: 'Custom',
    }

    const nextActivities = [newActivity, ...presetActivities]
    setPresetActivities(nextActivities)
    await persistSettings(budget, nextActivities)
    await addActivity(newActivity)
    setCustomName('')
    setCustomPoints(10)
  }

  const handleSelectDate = (dateKey) => {
    setSelectedDate(dateKey)
    const [year, month] = dateKey.split('-').map(Number)
    const nextMonth = new Date(year, month - 1, 1)
    setCalendarMonth(nextMonth)
  }

  const handleCalendarMonthChange = (monthOffset = 0, jumpToToday = false, forcedDate = null) => {
    if (jumpToToday) {
      const now = new Date()
      setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1))
      return
    }

    if (forcedDate) {
      setCalendarMonth(new Date(forcedDate.getFullYear(), forcedDate.getMonth(), 1))
      return
    }

    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + monthOffset, 1))
  }

  const monthStats = useMemo(() => {
    const monthIndex = calendarMonth.getMonth()
    const year = calendarMonth.getFullYear()
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()

    const days = Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1
      const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const total = dailyEntries[key]?.total ?? 0
      return { key, total, success: total <= budget }
    })

    const successDays = days.filter((day) => day.success).length
    const totalSpent = days.reduce((sum, day) => sum + day.total, 0)
    const average = totalSpent / daysInMonth
    const successRate = (successDays / daysInMonth) * 100

    return { days, successDays, totalSpent, average, successRate }
  }, [budget, calendarMonth, dailyEntries])

  const remaining = Math.max(budget - selectedDateRecord.total, 0)
  const selectedLabel = formatSelectedDate(selectedDate)

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f6f2] px-4 text-slate-700">
        <div className="rounded-[28px] border border-[#dfe9df] bg-white/80 px-6 py-5 shadow-[0_18px_40px_rgba(116,147,115,0.12)] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#739373] border-t-transparent" />
            <span className="text-sm font-medium tracking-[0.18em] uppercase text-[#4d6b4d]">Loading detox data</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-slate-800">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
        <Header />

        <main className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.85fr]">
          <section className="rounded-[28px] border border-[#dfe9df] bg-white/80 p-5 shadow-[0_18px_60px_rgba(116,147,115,0.12)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[#739373]">Daily tracker</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-800">
                  {isToday
                    ? "Today's dopamine spend"
                    : `${selectedLabel.split(',')[0]} dopamine spend`}
                </h2>
              </div>
              {isToday ? (
                <button
                  type="button"
                  onClick={resetToday}
                  className="rounded-xl border border-[#e6ddd8] bg-[#fef7f5] px-3 py-2 text-xs font-medium text-[#8d5647] transition hover:border-[#e76f51]/40 hover:bg-[#fde8e4]"
                >
                  Reset today
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectedDate(today)}
                  className="rounded-xl border border-[#bfd2bf] bg-[#edf6ee] px-3 py-2 text-xs font-medium text-[#4d6b4d] transition hover:bg-[#e3ebe3]"
                >
                  Back to Today
                </button>
              )}
            </div>

            {!isToday && (
              <div className="mt-4 rounded-2xl border border-[#dfe9df] bg-[#f5faf5] px-3 py-2 text-sm font-medium text-[#4d6b4d]">
                Read-Only Mode (Viewing Past Log)
              </div>
            )}

            <div className="mt-6 rounded-2xl border border-[#edf2ed] bg-[#f7faf7] p-4">
              <div className="mb-3 flex items-center justify-between text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-[#739373]" />
                  <span>Budget</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    aria-label="Dopamine budget"
                    type="number"
                    min="10"
                    step="5"
                    value={budget}
                    onChange={async (event) => {
                      const nextBudget = Number(event.target.value) || 10
                      setBudget(nextBudget)
                      await persistSettings(nextBudget, presetActivities)
                    }}
                    className="w-20 rounded-xl border border-[#bfd2bf] bg-white px-2 py-1 text-right text-slate-800 outline-none ring-0"
                  />
                  <span>pts</span>
                </div>
              </div>

              <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                <span>Used so far</span>
                <span className={hasExceeded ? 'text-[#c75f47]' : 'text-[#4d6b4d]'}>
                  {selectedDateRecord.total} / {budget} pts
                </span>
              </div>

              <div className="h-3 w-full overflow-hidden rounded-full bg-[#e5eae3]">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    hasExceeded
                      ? 'bg-gradient-to-r from-[#e76f51] via-[#f09373] to-[#f7c7ba]'
                      : isWarning
                        ? 'bg-gradient-to-r from-[#d9c98c] via-[#e9b86d] to-[#e76f51]'
                        : 'bg-gradient-to-r from-[#7aa67c] via-[#98b899] to-[#cfe5cf]'
                  }`}
                  style={{ width: `${Math.min((selectedDateRecord.total / Math.max(budget, 1)) * 100, 100)}%` }}
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>{Math.round(progressPercent)}% used</span>
                <span>{remaining > 0 ? `${remaining} pts remaining` : `${overLimit} pts over budget`}</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {presetActivities.map((activity) => {
                const isEditing = editingId === activity.id

                return (
                  <div
                    key={activity.id}
                    className="rounded-2xl border border-[#e7ece6] bg-white/80 px-4 py-3 text-left shadow-[0_8px_20px_rgba(116,147,115,0.07)] transition hover:border-[#a7c5a9] hover:bg-[#f5faf5]"
                  >
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="grid gap-2 md:grid-cols-[1.2fr_0.5fr_0.7fr]">
                          <input
                            type="text"
                            value={editDraft.name}
                            onChange={(event) => setEditDraft((prev) => ({ ...prev, name: event.target.value }))}
                            className="rounded-xl border border-[#dfe9df] bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#739373]"
                          />
                          <input
                            type="number"
                            min="1"
                            value={editDraft.points}
                            onChange={(event) => setEditDraft((prev) => ({ ...prev, points: Number(event.target.value) || 1 }))}
                            className="rounded-xl border border-[#dfe9df] bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#739373]"
                          />
                          <select
                            value={editDraft.category}
                            onChange={(event) => setEditDraft((prev) => ({ ...prev, category: event.target.value }))}
                            className="rounded-xl border border-[#dfe9df] bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#739373]"
                          >
                            <option value="HIGH RISK">HIGH RISK</option>
                            <option value="TRIGGER">TRIGGER</option>
                            <option value="CUSTOM">CUSTOM</option>
                          </select>
                        </div>

                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="rounded-xl border border-[#dfe9df] bg-white px-3 py-2 text-sm text-slate-600 transition hover:bg-[#f4f8f4]"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => saveEditActivity(activity.id)}
                            className="rounded-xl bg-[#739373] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#688d68]"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex w-full items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-slate-800">{activity.name}</p>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{activity.category}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-[#e3ebe3] px-2.5 py-1 text-sm font-medium text-[#4d6b4d]">
                            {activity.points} pts
                          </span>

                          <button
                            type="button"
                            onClick={() => startEditActivity(activity)}
                            disabled={!isToday}
                            className="rounded-xl border border-[#e5ebe5] bg-[#f5f8f5] p-2 text-slate-500 transition hover:border-[#b8d0b7] hover:text-[#4d6b4d] disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label={`Edit ${activity.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteActivity(activity.id)}
                            disabled={!isToday}
                            className="rounded-xl border border-[#f0d7d0] bg-[#fff7f5] p-2 text-[#8d5647] transition hover:border-[#e76f51]/40 hover:bg-[#fde8e4] disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label={`Delete ${activity.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => removeLatestActivity(activity.id)}
                            disabled={!isToday}
                            className="rounded-xl border border-[#e7d8d0] bg-[#fff7f5] p-2 text-[#8d5647] transition hover:border-[#e76f51]/40 hover:bg-[#fde8e4] disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label={`Remove ${activity.name}`}
                          >
                            <span className="text-lg leading-none">−</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => addActivity(activity)}
                            disabled={!isToday}
                            className="rounded-xl border border-[#b8d0b7] bg-[#edf6ee] p-2 text-[#4f7850] transition hover:border-[#739373] hover:bg-[#e3ebe3] disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label={`Add ${activity.name}`}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {isToday ? (
              <form onSubmit={addCustomActivity} className="mt-6 rounded-2xl border border-dashed border-[#b8d0b7] bg-[#f2f7f2] p-4">
                <div className="mb-3 flex items-center gap-2 text-[#4d6b4d]">
                  <Activity className="h-4 w-4" />
                  <span className="text-sm font-medium">Custom activity</span>
                </div>
                <div className="grid gap-3 md:grid-cols-[1.3fr_0.7fr_auto]">
                  <input
                    type="text"
                    value={customName}
                    onChange={(event) => setCustomName(event.target.value)}
                    placeholder="Example: Late-night doomscroll"
                    className="rounded-xl border border-[#dfe9df] bg-white px-3 py-2.5 text-slate-800 placeholder:text-slate-500 focus:border-[#739373] outline-none"
                  />
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={customPoints}
                    onChange={(event) => setCustomPoints(Number(event.target.value) || 1)}
                    className="rounded-xl border border-[#dfe9df] bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-[#739373]"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-gradient-to-r from-[#739373] to-[#93a983] px-4 py-2.5 font-medium text-white shadow-[0_10px_25px_rgba(115,147,115,0.25)] transition hover:brightness-105"
                  >
                    Add
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-[#dfe9df] bg-[#f5faf5] p-4 text-sm text-[#4d6b4d]">
                Read-Only Mode: custom activity changes are disabled for this date.
              </div>
            )}
          </section>

          <aside className="space-y-6">
            <StatCard
              icon={Target}
              label="Success rate"
              value={`${Math.round(monthStats.successRate)}%`}
              hint={`${monthStats.successDays} successful days this month`}
              tone="sage"
            />
            <StatCard
              icon={TrendingUp}
              label="Avg dopamine/day"
              value={`${Math.round(monthStats.average)} pts`}
              hint={`${monthStats.totalSpent} pts across ${monthStats.days.length} days`}
              tone="purple"
            />
            <StatCard
              icon={Flame}
              label="Today status"
              value={hasExceeded ? 'Over limit' : isWarning ? 'High Risk Zone' : remaining > 0 ? 'On track' : 'At budget'}
              hint={hasExceeded ? 'Action needed to cool down' : isWarning ? 'Action needed before the limit' : `${remaining} points left today`}
              tone={hasExceeded ? 'rose' : isWarning ? 'amber' : 'emerald'}
            />

            <div className="rounded-[28px] border border-[#e7ece6] bg-white/80 p-5 shadow-[0_18px_40px_rgba(116,147,115,0.12)] backdrop-blur-xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[#739373]">Today log</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-800">Breakdown</h3>
                </div>
                <div className="rounded-full bg-[#edf6ee] px-2 py-1 text-sm text-[#4d6b4d]">
                  {selectedDateRecord.items.length} entries
                </div>
              </div>

              <div className="space-y-3">
                {selectedDateRecord.items.length ? (
                  selectedDateRecord.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-2xl border border-[#edf2ed] bg-[#f7faf7] px-3 py-2.5"
                    >
                      <div>
                        <p className="font-medium text-slate-800">{item.name}</p>
                        <p className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-[#fde8e4] px-2 py-1 text-sm font-medium text-[#a6533d]">
                          +{item.points}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeEntry(item.id)}
                          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-[#f9eae7] hover:text-[#a6533d]"
                          aria-label={`Remove ${item.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#d4dfd4] bg-[#f5faf5] p-4 text-sm text-slate-500">
                    {isToday
                      ? 'No dopamine spikes logged yet. Pick an activity to begin the detox.'
                      : 'ไม่มีการบันทึกข้อมูลในวันนี้'}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </main>

        <div className="mt-6">
          <MonthlyCalendar
            dailyEntries={dailyEntries}
            budget={budget}
            selectedDate={selectedDate}
            visibleMonth={calendarMonth}
            onSelectDate={handleSelectDate}
            onMonthChange={handleCalendarMonthChange}
          />
        </div>

        {!isAlertDismissed && isWarning && (
          <div className="mt-6 rounded-[22px] border border-[#f3d4a7] bg-gradient-to-r from-[#fff5d8] via-[#fef3cf] to-[#fde8cc] px-5 py-4 text-[#7c4e2f] shadow-[0_12px_26px_rgba(121,93,41,0.08)]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-[#d67d32]" />
                <div className="space-y-2">
                  <div className="text-sm font-semibold uppercase tracking-[0.2em]">Early warning: high risk zone</div>
                  <p className="text-base font-medium text-[#553a28]">
                    You are at {selectedDateRecord.total} / {budget} pts. Reduce stimulus before crossing the full budget.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAlertDismissed(true)}
                className="rounded-full border border-[#d9b98d] bg-white/50 px-2.5 py-1 text-xs font-semibold text-[#7c4e2f] transition hover:bg-white/70"
                aria-label="Dismiss alert"
              >
                ×
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-[#f0d8a7] bg-white/45 p-4 backdrop-blur-sm">
              <div className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#7c4e2f]">4 Steps Recovery Framework</div>
              <ol className="space-y-2 text-sm leading-relaxed text-[#563d2d]">
                <li><span className="font-semibold">Step 1:</span> Mindful Breathing / Box Breathing (5–15 mins)</li>
                <li><span className="font-semibold">Step 2:</span> Cold Water Shock (Face/Neck) to trigger Mammalian Dive Reflex</li>
                <li><span className="font-semibold">Step 3:</span> High-Intensity Physical Burst (Push-ups/Squats)</li>
                <li><span className="font-semibold">Step 4:</span> Change Environment Immediately (Step outside/Public area)</li>
              </ol>
            </div>
          </div>
        )}

        <div className="mt-6 rounded-[28px] border border-[#e7ece6] bg-white/80 p-5 shadow-[0_18px_40px_rgba(116,147,115,0.12)] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-[#739373]" />
            <p className="text-sm uppercase tracking-[0.26em] text-[#739373]">Detox insight</p>
          </div>
          <p className="mt-3 text-lg text-slate-700">
            {hasExceeded
              ? 'Your current pattern is above the daily limit. Cut back on the high-reward habits and replace them with low-stimulation recovery options.'
              : `You are ${remaining} points away from your cap. Keep your momentum steady and stay consistent with the low-dopamine routine.`}
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
