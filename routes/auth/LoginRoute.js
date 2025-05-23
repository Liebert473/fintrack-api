import express from 'express';
const router = express.Router()
import connectDB from '../../db.js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken'

dotenv.config()

router.post('api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Email or username and password are required.' });
    }

    const db = await connectDB();

    // Find user by either email or username
    const user = await db.collection('users').findOne({
        $or: [{ email: username }, { username: username }]
    });

    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
        return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token });
});


module.exports = router
