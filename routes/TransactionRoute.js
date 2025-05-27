import express from 'express';
const router = express.Router()
import connectDB from '../db.js';
import { ObjectId } from 'mongodb';
import authenticateToken from './auth/authMiddleware.js';

async function GetTransactions(filterObj = {}) {
  const db = await connectDB();
  const query = {};

  // Build dynamic MongoDB query from filterObj
  if (filterObj.minAmount) query.amount = { ...query.amount, $gte: Number(filterObj.minAmount) };
  if (filterObj.maxAmount) query.amount = { ...query.amount, $lte: Number(filterObj.maxAmount) };
  if (filterObj.type) query.type = filterObj.type;
  if (filterObj.account) query.account = new ObjectId(filterObj.account);
  if (filterObj.category) query["category._id"] = new ObjectId(filterObj.category);
  if (filterObj.fromDate) query.date = { ...query.date, $gte: filterObj.fromDate };
  if (filterObj.toDate) query.date = { ...query.date, $lte: filterObj.toDate };
  if (filterObj._id) query._id = new ObjectId(filterObj._id)
  if (filterObj.user) query.user = new ObjectId(filterObj.user)

  const transactions = await db.collection("transactions").find(query).sort({ date: -1 }).toArray();
  return transactions;
}

// Get all transactions (no filter)
router.get('/api/transactions', authenticateToken, async (req, res) => {
  const transactions = await GetTransactions({ user: new ObjectId(req.user.id) });
  res.json(transactions);
});

// Get data by endDate and days
async function GetStackedTransactions(endDate, days, type, user) {
  const db = await connectDB();

  const matchQuery = { user };
  if (type) matchQuery.type = type;
  if (endDate) matchQuery.date = { $lte: endDate };

  const allDataLength = await db.collection("transactions").countDocuments(type ? { type, user } : { user });

  const cursor = db.collection("transactions")
    .find(matchQuery)
    .sort({ date: -1 });

  const results = [];
  const uniqueDates = new Set();

  while (await cursor.hasNext()) {
    const item = await cursor.next();
    if (!uniqueDates.has(item.date)) {
      if (uniqueDates.size >= days) break;
      uniqueDates.add(item.date);
    }
    results.push(item);
  }

  return {
    transactions: results,
    uniqueDates: Array.from(uniqueDates),
    totalDataLength: allDataLength,
  };
}

router.get("/api/transactions/filter", authenticateToken, async (req, res) => {
  const { endDate, days, type, minAmount, maxAmount, fromDate, toDate, account, category } = req.query;

  if (endDate && days) {
    const { transactions, uniqueDates, totalDataLength } = await GetStackedTransactions(endDate, parseInt(days), type, new ObjectId(req.user.id));
    return res.json({ transactions, uniqueDates, totalDataLength });
  }

  // fallback filtering
  const transactions = await GetTransactions({
    minAmount, maxAmount, type, fromDate, toDate, account, category, user: req.user.id
  });

  const uniqueDates = [...new Set(transactions.map(t => t.date))];

  return res.json({
    transactions,
    uniqueDates,
    totalDataLength: transactions.length,
  });
});

// Get a transaction by ID
router.get('/api/transactions/:id', authenticateToken, async (req, res) => {
  const transaction = await GetTransactions({ _id: new ObjectId(req.params.id) })
  if (!transaction) {
    return res.status(404).json({ message: 'Transaction not found' })
  }
  res.json(transaction)
}
)

// Create a new transaction
router.post('/api/transactions', authenticateToken, async (req, res) => {
  const db = await connectDB();
  const newTransaction = req.body;
  newTransaction.account = new ObjectId(newTransaction.account);
  newTransaction.category._id = new ObjectId(newTransaction.category._id);

  const result = await db.collection('transactions').insertOne({ ...newTransaction, user: new ObjectId(req.user.id) });

  res.status(201).json({
    message: 'Transaction created successfully',
    transaction: { ...newTransaction, _id: result.insertedId }
  });
});


// Update a transaction
router.put('/api/transactions/:id', authenticateToken, async (req, res) => {
  const db = await connectDB();
  const { id } = req.params;

  if (!ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid ID' });

  const updateData = { ...req.body }
  delete updateData._id
  delete updateData.user

  updateData.category._id = new ObjectId(updateData.category._id)
  updateData.account = new ObjectId(updateData.account)

  const result = await db.collection('transactions').findOneAndUpdate(
    { _id: new ObjectId(id), user: new ObjectId(req.body.user) },
    { $set: updateData },
    { returnDocument: 'after' }
  );

  if (!result) {
    return res.status(404).json({ message: 'Transaction not found' });
  }

  res.json({
    message: 'Transaction updated successfully',
    transaction: result
  });
})

// Delete a transaction
router.delete('/api/transactions/:id', authenticateToken, async (req, res) => {
  const db = await connectDB();
  const { id } = req.params;

  const result = await db.collection('transactions').deleteOne({ _id: new ObjectId(id) });

  if (result.deletedCount === 0) {
    return res.status(404).json({ message: 'Transaction not found' });
  }

  res.json({ message: 'Transaction deleted successfully' });
});


export default router
export { GetTransactions }