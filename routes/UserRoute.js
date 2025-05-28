import express from 'express';
import multer from 'multer';
import cloudinary from '../config/cloudinary.js';
import streamifier from 'streamifier';
import connectDB from '../db.js';
import authenticateToken from './auth/authMiddleware.js';
import { ObjectId } from 'mongodb';

const router = express.Router();

// Use memory storage (no disk)
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/api/user/uploadProfile', authenticateToken, upload.single('profileImage'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        // Stream to Cloudinary
        const streamUpload = () =>
            new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: 'profile_images' },
                    (error, result) => {
                        if (result) resolve(result);
                        else reject(error);
                    }
                );
                streamifier.createReadStream(req.file.buffer).pipe(stream);
            });

        const result = await streamUpload();

        // Save image URL to MongoDB (example user collection)
        const db = await connectDB();
        const users = db.collection('users');

        const userId = new ObjectId(req.user.id); // get from auth/session
        await users.updateOne(
            { _id: userId },
            { $set: { profileImage: result.secure_url } }
        );

        res.json({ message: 'Uploaded successfully', imageUrl: result.secure_url });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Upload failed' });
    }
});

export default router;
