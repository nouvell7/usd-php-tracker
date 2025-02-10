-- 환율 데이터 테이블
CREATE TABLE exchange_rates (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    usd_php_rate DECIMAL(10,4) NOT NULL,
    dollar_index DECIMAL(10,4),
    ma_20 DECIMAL(10,4),
    ma_50 DECIMAL(10,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 52주 통계 테이블
CREATE TABLE weekly_stats (
    id SERIAL PRIMARY KEY,
    week_ending DATE NOT NULL UNIQUE,
    high_rate DECIMAL(10,4) NOT NULL,
    low_rate DECIMAL(10,4) NOT NULL,
    mid_rate DECIMAL(10,4) NOT NULL,
    dollar_gap_ratio DECIMAL(10,4),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 거래 내역 테이블
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    transaction_date DATE NOT NULL,
    type VARCHAR(4) NOT NULL CHECK (type IN ('BUY', 'SELL')),
    amount_usd DECIMAL(10,2) NOT NULL,
    rate DECIMAL(10,4) NOT NULL,
    amount_php DECIMAL(10,2) NOT NULL,
    profit_loss DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id UUID REFERENCES auth.users(id)  -- Supabase 인증 연동
);

-- 인덱스 추가
CREATE INDEX idx_exchange_rates_date ON exchange_rates(date);
CREATE INDEX idx_weekly_stats_week_ending ON weekly_stats(week_ending);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);

-- 초기 데이터 삽입을 위한 함수
CREATE OR REPLACE FUNCTION calculate_amount_php()
RETURNS TRIGGER AS $$
BEGIN
    NEW.amount_php := NEW.amount_usd * NEW.rate;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 거래금액 자동계산 트리거
CREATE TRIGGER calculate_transaction_amount
    BEFORE INSERT OR UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION calculate_amount_php();

-- Supabase RLS 정책 설정
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 거래만 볼 수 있음
CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);

-- 사용자는 자신의 거래만 추가할 수 있음
CREATE POLICY "Users can insert own transactions" ON transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 환율 데이터는 모든 인증된 사용자가 볼 수 있음
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view rates" ON exchange_rates
    FOR SELECT USING (auth.role() = 'authenticated');

-- 주간 통계도 모든 인증된 사용자가 볼 수 있음
ALTER TABLE weekly_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view stats" ON weekly_stats
    FOR SELECT USING (auth.role() = 'authenticated');

-- 알림 설정 테이블
CREATE TABLE rate_alerts (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    target_rate DECIMAL(10,4) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('ABOVE', 'BELOW')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RLS 정책 설정
ALTER TABLE rate_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own alerts" ON rate_alerts
    FOR ALL USING (auth.uid() = user_id);