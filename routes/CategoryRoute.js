import express from 'express';
const router = express.Router()
import fs from "fs";
const file_path = "./data/categories.json"
const transaction_file_path = "./data/transactions.json"

function GetTransactions() {
    try {
        const data = fs.readFileSync(transaction_file_path, "utf8");
        const transactions = JSON.parse(data);
        return transactions;
    } catch (err) {
        console.error("Error reading transactions file:", err);
        return [];
    }
}

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

function GetData() {
    try {
        const data = fs.readFileSync(file_path, "utf8");
        const categories = JSON.parse(data);
        return categories;
    } catch (err) {
        console.error("Error reading categories file:", err);
        return [];
    }
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
router.get('/api/categories', (req, res) => {
    const { search } = req.query;
    let categories = GetData();

    if (search) {
        categories = categories.filter(x =>
            x.name.toLowerCase().startsWith(search.toLowerCase())
        );
    }

    res.json(categories);
});


//Get category by id
router.get('/api/categories/:id', (req, res) => {
    const categories = GetData();
    const id = req.params.id
    res.json(categories.find(x => x.id == id))
});


// Create a new category
router.post('/api/categories', (req, res) => {
    const categories = GetData()
    const newdata = req.body
    categories.push(newdata)
    WriteData(categories)
    res.json({ message: 'Category created successfully', category: newdata })
})

// Update a category
router.put('/api/categories/:id', (req, res) => {
    let categories = GetData();
    const index = categories.findIndex(t => t.id === req.params.id);

    if (index === -1) {
        return res.status(404).json({ message: 'Category not found' });
    }

    // Update the category
    categories[index] = { ...categories[index], ...req.body };
    WriteData(categories);

    //Update related transactions
    const updatedCategory = categories[index];
    let transactions = GetTransactions();

    transactions = transactions.map(tx => {
        if (tx.category?.id === updatedCategory.id) {
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
router.delete('/api/categories/:id', (req, res) => {
    let categories = GetData()
    categories = categories.filter(t => t.id !== req.params.id)
    WriteData(categories)
    res.json({ message: 'Category deleted successfully' })

    let transactions = GetTransactions()
    transactions = transactions.filter(t => t.category.id !== req.params.id)
    WriteTransactions(transactions)
}
)

export default router