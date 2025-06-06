import express from 'express';
import multer from 'multer';
import cloudinary from '../config/cloudinary.js';
import streamifier from 'streamifier';
import connectDB from '../db.js';
import authenticateToken from './auth/authMiddleware.js';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

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

        res.json({ message: 'Profile Image uploaded successfully', imageUrl: result.secure_url });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Upload failed' });
    }
});

router.get('/api/user/userProfile', authenticateToken, async (req, res) => {
    const id = new ObjectId(req.user.id);

    if (!id) {
        res.status(400).json({ message: 'userID required' })
    }

    const db = await connectDB();
    const user = await db.collection('users').findOne({ _id: id });
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }
    res.json(user)
})

router.put('/api/user/updateProfile', authenticateToken, async (req, res) => {
    const db = await connectDB();
    const userId = new ObjectId(req.user.id);
    const { name, username, email } = req.body;

    if (!name || !username || !email) {
        return res.status(400).json({ message: 'Name, username, and email are required.' });
    }

    try {
        // Check for existing users with the same username or email (excluding current user)
        const conflict = await db.collection('users').findOne({
            _id: { $ne: userId },
            $or: [{ username }, { email }]
        });

        if (conflict) {
            return res.status(409).json({
                message: 'Username or email already in use by another account.'
            });
        }

        const update = { name, username, email };
        const result = await db.collection('users').findOneAndUpdate(
            { _id: userId },
            { $set: update },
            { returnDocument: 'after' }
        );

        if (!result) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.json({
            message: 'Profile updated successfully.',
            user: result
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error while updating profile.' });
    }
});

router.delete('/api/user/deleteProfile', authenticateToken, async (req, res) => {
    const db = await connectDB();
    const userId = new ObjectId(req.user.id);

    try {
        // Delete user from users collection
        const result = await db.collection('users').deleteOne({ _id: userId });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Optionally, delete related data from other collections (e.g., accounts, categories)
        await db.collection('accounts').deleteMany({ user: userId });
        await db.collection('categories').deleteMany({ user: userId });
        await db.collection('transactions').deleteMany({ user: userId })

        res.json({ message: 'Profile deleted successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error while deleting profile.' });
    }
});

router.put('/api/user/updatePassword', authenticateToken, async (req, res) => {
    const db = await connectDB();
    const userId = new ObjectId(req.user.id);
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current password and new password are required.' });
    }

    if (currentPassword == newPassword) {
        return res.status(400).json({ message: 'Current password and new password must not be the same.' })
    }

    try {
        // Fetch the user to verify current password
        const user = await db.collection('users').findOne({ _id: userId });

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect.' });
        }

        // Hash the new password
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        // Update the user's password
        await db.collection('users').updateOne(
            { _id: userId },
            { $set: { passwordHash: newPasswordHash } }
        );

        res.json({ message: 'Password updated successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error while updating password.' });
    }
}
);


export default router;
