import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

declare module 'recharts' {
  export interface PieProps {
    data: any[];
    cx?: string | number;
    cy?: string | number;
    labelLine?: boolean;
    label?: any;
    outerRadius?: number;
    fill?: string;
    dataKey: string;
  }

  export interface CellProps {
    key: string;
    fill: string;
  }
} 