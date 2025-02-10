from fastapi import FastAPI, HTTPException
from datetime import date
from typing import List
from pydantic import BaseModel

app = FastAPI()

class ExchangeRate(BaseModel):
    date: date
    usd_php_rate: float
    dollar_index: float | None = None

class Transaction(BaseModel):
    transaction_date: date
    type: str
    amount_usd: float
    rate: float
    notes: str | None = None

@app.post("/api/rates")
async def add_rate(rate: ExchangeRate):
    # ... 환율 데이터 추가 로직

@app.get("/api/rates/latest")
async def get_latest_rate():
    # ... 최신 환율 조회 로직

@app.post("/api/transactions")
async def add_transaction(transaction: Transaction):
    # ... 거래 내역 추가 로직

@app.get("/api/transactions")
async def get_transactions():
    # ... 거래 내역 조회 로직 