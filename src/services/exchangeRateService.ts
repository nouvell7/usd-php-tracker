import { supabase } from '../lib/supabase'

interface ExchangeRateData {
  date: string
  usd_php_rate: number
  dollar_index?: number | null
}

// Frankfurter API 사용 (무료, 안정적)
const FOREX_API_URL = 'https://api.frankfurter.app';

export async function fetchLatestExchangeRate(): Promise<ExchangeRateData> {
  try {
    console.log('Fetching latest exchange rate...');
    
    const response = await fetch(`${FOREX_API_URL}/latest?from=USD&to=PHP`);
    const data = await response.json();
    
    if (!data.rates.PHP) {
      throw new Error('Failed to fetch PHP rate');
    }

    return {
      date: new Date().toISOString().split('T')[0],
      usd_php_rate: data.rates.PHP,
      dollar_index: null // DXY는 별도로 처리
    };
  } catch (error) {
    console.error('Failed to fetch latest rate:', error);
    throw error;
  }
}

export async function fetchHistoricalRates(): Promise<ExchangeRateData[]> {
  try {
    console.log('Fetching historical exchange rates...');
    
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    console.log('Date range:', { startDateStr, endDate });  // 날짜 범위 로깅
    
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('*')
      .gte('date', startDateStr)
      .lte('date', endDate);
    
    if (error) {
      console.error('Supabase error:', error);  // 에러 상세 로깅
      throw error;
    }

    console.log('Fetched data:', data);  // 가져온 데이터 로깅
    return data || [];
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

// 누락된 기간의 데이터를 가져와서 Supabase에 추가하는 함수
export async function updateMissingRates() {
  try {
    const startDate = '2024-02-09';
    const endDate = '2024-02-13';
    
    console.log('Fetching missing rates...', { startDate, endDate });
    
    const response = await fetch(
      `${FOREX_API_URL}/${startDate}..${endDate}?from=USD&to=PHP`
    );
    const data = await response.json();
    
    if (!data.rates) {
      throw new Error('Failed to fetch missing rates');
    }

    const missingRates = Object.entries(data.rates).map(([date, rates]: [string, any]) => ({
      date,
      usd_php_rate: rates.PHP,
      dollar_index: null
    }));

    console.log('Fetched missing rates:', missingRates);

    // Supabase에 데이터 삽입
    const { error } = await supabase
      .from('exchange_rates')
      .upsert(missingRates, {
        onConflict: 'date'
      });

    if (error) throw error;

    console.log('Missing rates updated in database');
    
    // 이동평균 재계산
    await calculateMovingAverages();
    console.log('Moving averages recalculated');

    return missingRates;
  } catch (error) {
    console.error('Failed to update missing rates:', error);
    throw error;
  }
} 