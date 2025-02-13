import { supabase } from '../lib/supabase'

interface ExchangeRateData {
  date: string
  usd_php_rate: number
  dollar_index?: number | null
}

// Frankfurter API 사용 (무료, 안정적)
const FOREX_API_URL = 'https://api.frankfurter.app';

async function fetchLatestExchangeRate(): Promise<ExchangeRateData> {
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

async function fetchHistoricalRates(): Promise<ExchangeRateData[]> {
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

async function updateHistoricalRates() {
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

async function updateExchangeRate(data: ExchangeRateData) {
  const { error } = await supabase
    .from('exchange_rates')
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return data
}

async function calculateMovingAverages() {
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

async function updateMissingRates() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Authentication required');
    }

    // 먼저 중복 데이터 확인 및 삭제
    const { data: existingData, error: checkError } = await supabase
      .from('exchange_rates')
      .select('*')
      .eq('date', '2025-02-13');

    if (checkError) throw checkError;

    // 중복 데이터가 있으면 모두 삭제
    if (existingData && existingData.length > 1) {
      const { error: deleteError } = await supabase
        .from('exchange_rates')
        .delete()
        .eq('date', '2025-02-13');
      
      if (deleteError) throw deleteError;
    }

    // 평일 데이터만 포함
    const rates = [
      { date: '2025-02-12', usd_php_rate: 56.08 },  // 화요일
      { date: '2025-02-13', usd_php_rate: 56.05 }   // 수요일
    ];

    // 새 데이터 삽입
    const { data, error } = await supabase
      .from('exchange_rates')
      .upsert(rates, {
        onConflict: 'date'
      });

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    console.log('Missing rates updated in database');
    
    await calculateMovingAverages();
    console.log('Moving averages recalculated');

    return data;
  } catch (error) {
    console.error('Failed to update missing rates:', error);
    throw error;
  }
}

// 달러 인덱스를 계산하는 함수 수정
async function calculateDollarIndex(date: string): Promise<number | null> {
  try {
    // USD/EUR 환율 데이터 가져오기
    const response = await fetch(
      `${FOREX_API_URL}/${date}?from=USD&to=EUR`
    );
    const data = await response.json();
    
    if (!data.rates?.EUR) {
      console.warn('Failed to fetch EUR rate for date:', date);
      return null;
    }

    // 달러 인덱스 계산: (1/EUR) * 100
    const usdEurRate = data.rates.EUR;
    const dollarIndex = (1 / usdEurRate) * 100;
    
    console.log('Calculated dollar index:', { date, usdEurRate, dollarIndex });
    return dollarIndex;
  } catch (error) {
    console.warn('Failed to calculate dollar index:', error);
    return null;
  }
}

// 기간별 환율 데이터를 가져와서 업데이트하는 함수 수정
async function updateLatestRates(
  period: string = '1D',
  customStartDate?: string,
  customEndDate?: string
) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Authentication required');
    }

    let startDate: Date, endDate: Date;

    if (period === 'custom' && customStartDate) {
      startDate = new Date(customStartDate);
      endDate = new Date(customEndDate || customStartDate);
    } else {
      endDate = new Date();
      startDate = new Date();

      // 기존 기간별 시작 날짜 계산
      switch (period) {
        case '1D':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case '1W':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '2W':
          startDate.setDate(startDate.getDate() - 14);
          break;
        case '1M':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case '3M':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case '6M':
          startDate.setMonth(startDate.getMonth() - 6);
          break;
        case '1Y':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    console.log('Fetching rates from API...', { startDateStr, endDateStr });
    
    const response = await fetch(
      `${FOREX_API_URL}/${startDateStr}..${endDateStr}?from=USD&to=PHP`
    );
    const data = await response.json();
    
    if (!data.rates) {
      throw new Error('Failed to fetch rates');
    }

    // API 응답을 환율 데이터 배열로 변환하고 달러 인덱스 추가
    const newRates = await Promise.all(
      Object.entries(data.rates).map(async ([date, rates]: [string, any]) => {
        const dollarIndex = await calculateDollarIndex(date);
        return {
          date,
          usd_php_rate: rates.PHP,
          dollar_index: dollarIndex,
          created_at: new Date().toISOString()
        };
      })
    );

    console.log('Rates with calculated dollar index:', newRates);

    // 기존 데이터 업데이트
    const { error } = await supabase
      .from('exchange_rates')
      .upsert(newRates, {
        onConflict: 'date'
      });

    if (error) throw error;

    // 이동평균 재계산
    await calculateMovingAverages();
    
    return newRates;
  } catch (error) {
    console.error('Failed to update rates:', error);
    throw error;
  }
}

// 마지막에 한번에 export
export {
  fetchLatestExchangeRate,
  fetchHistoricalRates,
  updateHistoricalRates,
  updateExchangeRate,
  calculateMovingAverages,
  updateMissingRates,
  updateLatestRates
} 