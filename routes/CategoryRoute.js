import express from 'express';
const router = express.Router()
import fs from "fs";
import { GetTransactions } from './TransactionRoute.js';
import connectDB from '../db.js';

// Utility: Connect and return 'categories' collection
async function getCategoryCollection() {
    const db = await connectDB();
    return db.collection("categories");
}

// Get all categories (with optional search)
router.get("/api/categories", async (req, res) => {
    const { search } = req.query;
    const collection = await getCategoryCollection();

    const filter = search
        ? { name: { $regex: `^${search}`, $options: "i" } }
        : {};

    const categories = await collection.find(filter).toArray();
    res.json(categories);
});

// Get category by ID
router.get("/api/categories/:id", async (req, res) => {
    const collection = await getCategoryCollection();
    const category = await collection.findOne({ _id: new ObjectId(req.params.id) });

    if (!category) {
        return res.status(404).json({ message: "Category not found" });
    }

    res.json(category);
});

// Create new category
router.post("/api/categories", async (req, res) => {
    const collection = await getCategoryCollection();
    const result = await collection.insertOne(req.body);

    res.json({
        message: "Category created successfully",
        category: { ...req.body, _id: result.insertedId },
    });
});

// Update category and related transactions
router.put("/api/categories/:id", async (req, res) => {
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
        { "category._id": id },
        { $set: { "category.name": updatedCategory.name } }
    );

    res.json({
        message: "Category updated successfully",
        category: updatedCategory,
    });
});

// Delete category and update related transactions
router.delete("/api/categories/:id", async (req, res) => {
    const id = req.params.id;
    const collection = await getCategoryCollection();

    const deleteResult = await collection.deleteOne({ _id: new ObjectId(id) });

    if (deleteResult.deletedCount === 0) {
        return res.status(404).json({ message: "Category not found" });
    }

    // Remove all transactions with this category
    const db = await connectDB();
    await db.collection("transactions").deleteMany({ "category._id": id });

    res.json({ message: "Category and related transactions deleted successfully" });
});

export default router
export { GetCategories }