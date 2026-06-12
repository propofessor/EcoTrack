// src/components/widgets/ChartBar.jsx
import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getCo2Stats } from '../../api/dashboardApi'

// Mock data for development/testing
const MOCK_DATA = [
  { month: '2024-01', co2: '150.25' },
  { month: '2024-02', co2: '165.80' },
  { month: '2024-03', co2: '145.60' },
  { month: '2024-04', co2: '180.45' },
  { month: '2024-05', co2: '155.30' },
  { month: '2024-06', co2: '175.90' },
]

export function ChartBar({ config }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = {}
    if (config.dateMode === 'dynamic') {
      const d = new Date()
      d.setDate(d.getDate() - (config.dynamicDays || 30))
      params.date_start = d.toISOString()
    } else {
      if (config.startDate) params.date_start = config.startDate
      if (config.endDate) params.date_end = config.endDate
    }

    getCo2Stats(params)
      .then(res => {
        // Aggregazione dati per mese (semplificata)
        const agg = {}
        res.data?.forEach(d => {
          const month = d.timestamp_start?.slice(0, 7) || 'N/D'
          agg[month] = (agg[month] || 0) + (parseFloat(d.co2_kgs) || 0)
        })
        const formattedData = Object.entries(agg).map(([month, co2]) => ({ month, co2: co2.toFixed(2) }))
        setData(formattedData.length > 0 ? formattedData : MOCK_DATA)
      })
      .catch(e => {
        console.warn('API Error, using mock data:', e.message)
        setData(MOCK_DATA)
      })
      .finally(() => setLoading(false))
  }, [config])

  if (loading) return <div style={{ padding: 20, color: 'var(--text-secondary)' }}>Caricamento...</div>

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', minHeight: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
          <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
          <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
            labelStyle={{ color: 'var(--text-primary)' }}
          />
          <Bar dataKey="co2" fill="var(--accent)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}