import express from 'express';
const router = express.Router()
import connectDB from '../db.js';
import { ObjectId } from 'mongodb';
import authenticateToken from './auth/authMiddleware.js';

// Utility: Connect and return 'categories' collection
async function getCategoryCollection() {
    const db = await connectDB();
    return db.collection("categories");
}

// Get all categories (with optional search)
router.get("/api/categories", authenticateToken, async (req, res) => {
    try {
        const { search } = req.query;
        const collection = await getCategoryCollection();

        let filter = { user: new ObjectId(req.user.id) };

        if (search) {
            filter = {
                $and: [
                    { name: { $regex: `^${search}`, $options: 'i' } },
                    { user: new ObjectId(req.user.id) }
                ]
            };
        }

        const categories = await collection.find(filter).toArray();
        res.json(categories);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});


// Get category by ID
router.get("/api/categories/:id", authenticateToken, async (req, res) => {
    const collection = await getCategoryCollection();
    const category = await collection.findOne({ _id: new ObjectId(req.params.id) });

    if (!category) {
        return res.status(404).json({ message: "Category not found" });
    }

    res.json(category);
});

// Create new category
router.post("/api/categories", authenticateToken, async (req, res) => {
    const collection = await getCategoryCollection();
    const result = await collection.insertOne({ ...req.body, user: new ObjectId(req.user.id) });

    res.json({
        message: "Category created successfully",
        category: { ...req.body, _id: result.insertedId },
    });
});

// Update category and related transactions
router.put("/api/categories/:id", authenticateToken, async (req, res) => {
    const id = req.params.id;
    const collection = await getCategoryCollection();

    const updateResult = await collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: req.body },
        { returnDocument: "after" }
    );

    if (!updateResult.value) {
        return res.status(404).json({ message: "Category not found" });
    }

    const updatedCategory = updateResult.value;

    // Update all transactions with this category
    const db = await connectDB();
    await db.collection("transactions").updateMany(
        { "category._id": new ObjectId(id) },
        { $set: { "category.name": updatedCategory.name } }
    );

    res.json({
        message: "Category updated successfully",
        category: updatedCategory,
    });
});

// Delete category and update related transactions
router.delete("/api/categories/:id", authenticateToken, async (req, res) => {
    const id = req.params.id;
    const collection = await getCategoryCollection();

    const deleteResult = await collection.deleteOne({ _id: new ObjectId(id) });

    if (deleteResult.deletedCount === 0) {
        return res.status(404).json({ message: "Category not found" });
    }

    // Remove all transactions with this category
    const db = await connectDB();
    await db.collection("transactions").deleteMany({ "category._id": new ObjectId(id) });

    res.json({ message: "Category and related transactions deleted successfully" });
});

export default router
export { getCategoryCollection }