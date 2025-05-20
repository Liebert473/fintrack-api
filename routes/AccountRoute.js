import express from 'express';
const router = express.Router()
import fs from "fs";
const file_path = "./data/accounts.json"
const transaction_file_path = "./data/transactions.json"
import { GetTransactions } from './TransactionRoute';

function WriteTransactions(transactions) {
    try {
        transactions = transactions.sort((a, b) => new Date(b.date) - new Date(a.date))
        const data = JSON.stringify(transactions, null, 2);
        fs.writeFileSync(transaction_file_path, data);
        console.log("Transactions file updated successfully.");
    } catch (err) {
        console.error("Error writing transactions file:", err);
    }
}

function GetAccounts() {
    try {
        const data = fs.readFileSync(file_path, "utf8");
        const accounts = JSON.parse(data);
        return accounts;
    } catch (err) {
        console.error("Error reading accounts file:", err);
        return [];
    }
}

function WriteData(accounts) {
    try {
        const data = JSON.stringify(accounts, null, 2);
        fs.writeFileSync(file_path, data);
        console.log("Accounts file updated successfully.");
    } catch (err) {
        console.error("Error writing accounts file:", err);
    }
}

function getAccountData(account, allTransactions) {
    const accountTransactions = allTransactions.filter(tx => tx.account === account.id);

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

// Get all accounts (no filter)
router.get('/api/accounts', async (req, res) => {
    const accounts = await GetAccounts();
    const transactions = await GetTransactions(); // fetch once

    res.json(
        accounts.map(account => ({
            ...account,
            ...getAccountData(account, transactions),
        }))
    );
});


// Create a new account
router.post('/api/accounts', async (req, res) => {
    const accounts = await GetAccounts()
    const newdata = req.body
    accounts.push(newdata)
    WriteData(accounts)
    res.json({ message: 'Account created successfully', account: newdata })
})

// Update a account
router.put('/api/accounts/:id', async (req, res) => {
    let accounts = await GetAccounts()
    const index = accounts.findIndex(t => t.id === req.params.id)
    if (index === -1) {
        return res.status(404).json({ message: 'account not found' })
    }
    accounts[index] = { ...accounts[index], ...req.body }
    WriteData(accounts)
    res.json({ message: 'Account updated successfully', account: accounts[index] })
})

// Delete a account
router.delete('/api/accounts/:id', async (req, res) => {
    let accounts = await GetAccounts()
    accounts = accounts.filter(t => t.id !== req.params.id)
    WriteData(accounts)
    res.json({ message: 'Account deleted successfully' })

    let transactions = await GetTransactions()
    transactions = transactions.filter(t => t.account !== req.params.id)
    WriteTransactions(transactions)
}
)

export default router
export { GetAccounts }