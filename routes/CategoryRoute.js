import express from 'express';
const router = express.Router()
import fs from "fs";
const file_path = "./data/categories.json"
const transaction_file_path = "./data/transactions.json"
import { GetTransactions } from './TransactionRoute.js';
import connectDB from '../db.js';

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

async function GetCategories(filterObj = {}) {
    const db = await connectDB()
    const categories = await db.collection('categories').find(filterObj).toArray()
    return categories
}

function WriteData(categories) {
    try {
        const data = JSON.stringify(categories, null, 2);
        fs.writeFileSync(file_path, data);
        console.log("Categories file updated successfully.");
    } catch (err) {
        console.error("Error writing categories file:", err);
    }
}

// Get all categories (no filter)
router.get('/api/categories', async (req, res) => {
    const { search } = req.query;
    let categories = await GetCategories();

    if (search) {
        categories = categories.filter(x =>
            x.name.toLowerCase().startsWith(search.toLowerCase())
        );
    }

    res.json(categories);
});


//Get category by id
router.get('/api/categories/:id', async (req, res) => {
    const categories = await GetCategories();
    const id = req.params._id
    res.json(categories.find(x => x._id == id))
});


// Create a new category
router.post('/api/categories', async (req, res) => {
    const categories = await GetCategories()
    const newdata = req.body
    categories.push(newdata)
    WriteData(categories)
    res.json({ message: 'Category created successfully', category: newdata })
})

// Update a category
router.put('/api/categories/:id', async (req, res) => {
    let categories = await GetCategories();
    const index = categories.findIndex(t => t._id === req.params._id);

    if (index === -1) {
        return res.status(404).json({ message: 'Category not found' });
    }

    // Update the category
    categories[index] = { ...categories[index], ...req.body };
    WriteData(categories);

    //Update related transactions
    const updatedCategory = categories[index];
    let transactions = await GetTransactions();

    transactions = transactions.map(tx => {
        if (tx.category?._id === updatedCategory._id) {
            return {
                ...tx,
                category: {
                    ...tx.category,
                    name: updatedCategory.name
                }
            };
        }
        return tx;
    });

    WriteTransactions(transactions);

    res.json({
        message: 'Category updated successfully',
        category: updatedCategory
    });
});


// Delete a category
router.delete('/api/categories/:id', async (req, res) => {
    let categories = await GetCategories()
    categories = categories.filter(t => t._id !== req.params._id)
    WriteData(categories)
    res.json({ message: 'Category deleted successfully' })

    let transactions = await GetTransactions()
    transactions = transactions.filter(t => t.category._id !== req.params._id)
    WriteTransactions(transactions)
}
)

export default router
export { GetCategories }