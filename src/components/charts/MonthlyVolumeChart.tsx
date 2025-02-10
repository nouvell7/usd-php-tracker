import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface MonthlyVolumeData {
  month: string;
  volume: number;
}

interface Props {
  data: MonthlyVolumeData[];
}

export function MonthlyVolumeChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="volume" fill="#2563eb" />
      </BarChart>
    </ResponsiveContainer>
  )
} 