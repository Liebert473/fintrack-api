import express from 'express';
const router = express.Router()
import { GetTransactions } from './TransactionRoute.js';
import connectDB from '../db.js';
import { ObjectId } from 'mongodb';
import authenticateToken from './auth/authMiddleware.js';

// Utility: connect and return 'accounts' collection
async function getAccountCollection() {
    const db = await connectDB();
    return db.collection("accounts");
}

// Utility: compute balance data per account
async function computeAccountData(account, user) {
    const accountTransactions = await GetTransactions({ account: account._id, user })

    const incomes = Number(
        accountTransactions
            .filter(tx => tx.type === "income")
            .reduce((sum, tx) => sum + tx.amount, 0)
            .toFixed(2)
    );

    const expenses = Number(
        accountTransactions
            .filter(tx => tx.type === "expense")
            .reduce((sum, tx) => sum + tx.amount, 0)
            .toFixed(2)
    );

    const totalBalance = Number(((account.initialBalance + incomes) - expenses).toFixed(2));

    return { incomes, expenses, totalBalance };
}

// GET: All accounts with balances
router.get("/api/accounts", authenticateToken, async (req, res) => {
    const collection = await getAccountCollection();
    const accounts = await collection.find({ user: req.user.id }).toArray();

    const result = await Promise.all(
        accounts.map(async account => {
            const accountData = await computeAccountData(account, new ObjectId(req.user.id));
            return {
                ...account,
                ...accountData,
            };
        })
    );

    res.json(result);
});

// POST: Create a new account
router.post("/api/accounts", authenticateToken, async (req, res) => {
    const collection = await getAccountCollection();
    const result = await collection.insertOne({ ...req.body, user: new ObjectId(req.user.id) });

    res.json({
        message: "Account created successfully",
        account: { ...req.body, _id: result.insertedId },
    });
});

// PUT: Update an account
router.put("/api/accounts/:id", authenticateToken, async (req, res) => {
    const collection = await getAccountCollection();
    const id = req.params.id;

    const updateData = { ...req.body }
    delete updateData._id
    delete updateData._id

    updateData.category._id = new ObjectId(updateData.category._id)

    const updateResult = await collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateData },
        { returnDocument: "after" }
    );

    if (!updateResult.value) {
        return res.status(404).json({ message: "Account not found" });
    }

    res.json({
        message: "Account updated successfully",
        account: updateResult.value,
    });
});

// DELETE: Delete an account and its transactions
router.delete("/api/accounts/:id", authenticateToken, async (req, res) => {
    const id = req.params.id;
    const collection = await getAccountCollection();

    const deleteResult = await collection.deleteOne({ _id: new ObjectId(id) });

    if (deleteResult.deletedCount === 0) {
        return res.status(404).json({ message: "Account not found" });
    }

    // Remove related transactions
    const db = await connectDB();
    await db.collection("transactions").deleteMany({ account: new ObjectId(id) });

    res.json({ message: "Account and related transactions deleted successfully" });
});

export default router
export { getAccountCollection }