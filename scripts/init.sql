-- 데이터베이스 생성
CREATE DATABASE usd_php_tracker;

-- 데이터베이스 연결
\c usd_php_tracker

-- 스키마 적용
\i schema.sql

-- 테스트 데이터 삽입
INSERT INTO exchange_rates (date, usd_php_rate, dollar_index)
VALUES 
    (CURRENT_DATE, 56.50, 104.5),
    (CURRENT_DATE - INTERVAL '1 day', 56.45, 104.3);

INSERT INTO weekly_stats (week_ending, high_rate, low_rate, mid_rate)
VALUES 
    (date_trunc('week', CURRENT_DATE), 56.80, 56.20, 56.50); 