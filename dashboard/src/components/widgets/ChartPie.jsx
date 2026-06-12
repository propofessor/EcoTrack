import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { getCo2Stats } from '../../api/dashboardApi'

const COLORS = ['#38a169', '#3182ce', '#d69e2e', '#e53e3e', '#805ad5']

const MOCK_DATA = [
  { name: 'Auto', value: 240 },
  { name: 'Autobus', value: 150 },
  { name: 'Bicicletta', value: 80 },
  { name: 'Treno', value: 120 },
]

export function ChartPie({ config }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCo2Stats({})
      .then(res => {
        // Aggrega per tipo di mezzo
        const agg = {}
        res.data?.forEach(d => {
          const label = d.movement_types?.label || 'altro'
          agg[label] = (agg[label] || 0) + (parseFloat(d.co2_kgs) || 0)
        })
        const formattedData = Object.entries(agg).map(([name, value]) => ({
          name,
          value: parseFloat(value.toFixed(2))
        }))
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
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" outerRadius="70%" dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
            formatter={(value) => [`${value} kg CO2`, '']}
          />
          <Legend wrapperStyle={{ color: 'var(--text-secondary)', fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}