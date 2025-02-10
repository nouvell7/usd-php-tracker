import { supabase } from '../lib/supabase'

interface ExchangeRateData {
  date: string
  usd_php_rate: number
  dollar_index?: number | null
}

interface AlphaVantageForexResponse {
  "Time Series FX (Daily)": {
    [key: string]: {
      "4. close": string
    }
  }
}

interface AlphaVantageRealtimeResponse {
  "Realtime Currency Exchange Rate": {
    "5. Exchange Rate": string
    "6. Last Refreshed": string
  }
}

const API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY;
const FOREX_DAILY_URL = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=USD&to_symbol=PHP&outputsize=full&apikey=${API_KEY}`;
const DXY_URL = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=DXY&outputsize=full&apikey=${API_KEY}`;
const FOREX_REALTIME_URL = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=USD&to_currency=PHP&apikey=${API_KEY}`;

export async function fetchHistoricalRates(): Promise<ExchangeRateData[]> {
  try {
    console.log('Fetching historical exchange rates...');
    
    // USD/PHP 환율 데이터 가져오기
    const forexResponse = await fetch(FOREX_DAILY_URL);
    const forexData: AlphaVantageForexResponse = await forexResponse.json();
    
    if (!forexData["Time Series FX (Daily)"]) {
      throw new Error('Failed to fetch forex data');
    }

    // DXY (달러 인덱스) 데이터 가져오기
    const dxyResponse = await fetch(DXY_URL);
    const dxyData = await dxyResponse.json();
    
    // 최근 1년치 데이터 추출
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const historicalRates = Object.entries(forexData["Time Series FX (Daily)"])
      .filter(([date]) => new Date(date) >= oneYearAgo)
      .map(([date, values]) => {
        const dxyValue = dxyData["Time Series (Daily)"]?.[date]?.["4. close"];
        return {
          date,
          usd_php_rate: parseFloat(values["4. close"]),
          dollar_index: dxyValue ? parseFloat(dxyValue) : null
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return historicalRates;
  } catch (error) {
    console.error('Failed to fetch historical rates:', error);
    throw error;
  }
}

export async function updateHistoricalRates() {
  try {
    const historicalRates = await fetchHistoricalRates();
    
    // 기존 데이터 삭제
    const { error: deleteError } = await supabase
      .from('exchange_rates')
      .delete()
      .gte('date', historicalRates[historicalRates.length - 1].date);
    
    if (deleteError) throw deleteError;

    // 새 데이터 삽입
    const { error: insertError } = await supabase
      .from('exchange_rates')
      .insert(historicalRates);

    if (insertError) throw insertError;

    // 이동평균 계산
    await calculateMovingAverages();

    console.log('Historical rates updated successfully');
  } catch (error) {
    console.error('Failed to update historical rates:', error);
    throw error;
  }
}

export async function updateExchangeRate(data: ExchangeRateData) {
  const { error } = await supabase
    .from('exchange_rates')
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function calculateMovingAverages() {
  const { data: rates, error } = await supabase
    .from('exchange_rates')
    .select('*')
    .order('date', { ascending: false })
    .limit(50)

  if (error) throw error

  if (!rates || rates.length === 0) return null

  const ma20 = rates.slice(0, 20).reduce((sum, rate) => sum + rate.usd_php_rate, 0) / 20
  const ma50 = rates.slice(0, 50).reduce((sum, rate) => sum + rate.usd_php_rate, 0) / 50

  // 최신 레코드 업데이트
  const { error: updateError } = await supabase
    .from('exchange_rates')
    .update({ ma_20: ma20, ma_50: ma50 })
    .eq('id', rates[0].id)

  if (updateError) throw updateError

  return { ma_20: ma20, ma_50: ma50 }
}

export async function fetchLatestExchangeRate(): Promise<ExchangeRateData> {
  try {
    console.log('Fetching latest exchange rate...');
    
    // USD/PHP 실시간 환율 가져오기
    const forexResponse = await fetch(FOREX_REALTIME_URL);
    const forexData: AlphaVantageRealtimeResponse = await forexResponse.json();
    
    if (!forexData["Realtime Currency Exchange Rate"]) {
      throw new Error('Failed to fetch realtime forex data');
    }

    // DXY (달러 인덱스) 데이터 가져오기
    const dxyResponse = await fetch(DXY_URL);
    const dxyData = await dxyResponse.json();
    
    const latestDxyDate = Object.keys(dxyData["Time Series (Daily)"])[0];
    const latestDxyValue = dxyData["Time Series (Daily)"]?.[latestDxyDate]?.["4. close"];

    return {
      date: new Date().toISOString().split('T')[0],
      usd_php_rate: parseFloat(forexData["Realtime Currency Exchange Rate"]["5. Exchange Rate"]),
      dollar_index: latestDxyValue ? parseFloat(latestDxyValue) : null
    };
  } catch (error) {
    console.error('Failed to fetch latest rate:', error);
    throw error;
  }
} 