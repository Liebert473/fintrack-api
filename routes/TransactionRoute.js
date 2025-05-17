import e from 'express';
import express from 'express';
const router = express.Router()
import fs from "fs";
const file_path = "./data/transactions.json"
import Transaction from "../models/Transaction.js"

async function GetData() {
  const transactions = await Transaction.find({})
  return transactions
}

function WriteData(transactions) {
  try {
    transactions = transactions.sort((a, b) => new Date(b.date) - new Date(a.date))
    const data = JSON.stringify(transactions, null, 2);
    fs.writeFileSync(file_path, data);
    console.log("Transactions file updated successfully.");
  } catch (err) {
    console.error("Error writing transactions file:", err);
  }
}

// Get all transactions (no filter)
router.get('/api/transactions', (req, res) => {
  const transactions = GetData();
  res.json(transactions);
});

// Get data by endDate and days
function GetDataByDateRange(endDate, days, type) {
  const data = GetData();
  const results = [];
  const dates = new Set();
  let startIndex = data.findIndex(t => t.date === endDate);

  if (startIndex === -1) {
    startIndex = data.findIndex(t => t.date < endDate);
    if (startIndex === -1) {
      return { results: [], dates: [] };
    }
  }

  for (let i = startIndex; i < data.length; i++) {
    const item = data[i]
    if (type && item.type != type) continue
    if (!dates.has(item.date)) {
      if (dates.size >= days) {
        break;
      } else {
        dates.add(item.date);
      }
    }
    results.push(item);
  }

  return { results, dates: Array.from(dates) };
}

router.get("/api/transactions/filter", (req, res) => {
  const { endDate, days, type, minAmount, maxAmount, fromDate, toDate, account, category } = req.query;

  if (endDate || days) {
    if (!endDate || !days) {
      return res.status(400).json({ message: "Missing endDate or days" });
    }

    const { results, dates } = GetDataByDateRange(endDate, parseInt(days), type);
    const allDataLength = type ? GetData().filter(x => x.type === type).length : GetData().length;

    return res.json({
      transactions: results,
      uniqueDates: dates,
      totalDataLength: allDataLength,
    });
  }

  // Filter fallback if no endDate/days logic
  let transactions = GetData();
  let uniqueDates = new Set();

  if (minAmount) {
    transactions = transactions.filter(x => x.amount >= Number(minAmount));
  }
  if (maxAmount) {
    transactions = transactions.filter(x => x.amount <= Number(maxAmount))
  }
  if (type) {
    transactions = transactions.filter(x => x.type == type)
  }
  if (account) {
    transactions = transactions.filter(x => x.account == account)
  }
  if (category) {
    transactions = transactions.filter(x => x.category.id == category)
  }
  if (fromDate) {
    transactions = transactions.filter(x => x.date >= fromDate)
  }
  if (toDate) {
    transactions = transactions.filter(x => x.date <= toDate)
  }

  for (const t of transactions) {
    uniqueDates.add(t.date);
  }

  return res.json({
    transactions,
    uniqueDates: Array.from(uniqueDates),
    totalDataLength: transactions.length,
  });
});



// Get a transaction by ID
router.get('/api/tarnsactions/:id', (req, res) => {
  const transactions = GetData()
  const transaction = transactions.find(t => t.id === req.params.id)
  if (!transaction) {
    return res.status(404).json({ message: 'Transaction not found' })
  }
  res.json(transaction)
}
)

// Create a new transaction
router.post('/api/transactions', (req, res) => {
  const transactions = GetData()
  const newdata = req.body
  transactions.push(newdata)
  WriteData(transactions)
  res.json({ message: 'Transaction created successfully', transaction: newdata })
})

// Update a transaction
router.put('/api/transactions/:id', (req, res) => {
  let transactions = GetData()
  const index = transactions.findIndex(t => t.id === req.params.id)
  if (index === -1) {
    return res.status(404).json({ message: 'Transaction not found' })
  }
  transactions[index] = { ...transactions[index], ...req.body }
  WriteData(transactions)
  res.json({ message: 'Transaction updated successfully', transaction: transactions[index] })
})

// Delete a transaction
router.delete('/api/transactions/:id', (req, res) => {
  let transactions = GetData()
  transactions = transactions.filter(t => t.id !== req.params.id)
  WriteData(transactions)
  res.json({ message: 'Transaction deleted successfully' })
}
)

export default router