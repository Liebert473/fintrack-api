import express from 'express';
const router = express.Router()
import connectDB from '../../db.js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { addNotification } from '../NotificationRoute.js';

dotenv.config();

router.post('/api/auth/register', async (req, res) => {
    const { email, password, name, username } = req.body
    if (!email || !password || !name || !username) return res.status(400).json({ error: 'Some reqired information are missing.' })

    const db = await connectDB()
    const user = await db.collection('users').find({
        $or: [
            { email },
            { username }
        ]
    }).toArray()

    if (user.length > 0) return res.status(409).json({ error: 'Username or email already exists.' })

    const passwordHash = await bcrypt.hash(password, 10)
    const result = await db.collection('users').insertOne({
        email,
        username,
        name,
        passwordHash,
        createdAt: new Date(),
        profileImage: 'https://res.cloudinary.com/dyde6pk5k/image/upload/v1748435593/profile_images/rdffhpilkqmrnq3cbge9.jpg'
    })

    db.collection('accounts').insertOne({
        name: 'Main Account',
        initialBalance: 0,
        user: result.insertedId,
    })

    db.collection('categories').insertMany([
        { name: 'Food', user: result.insertedId },
        { name: 'Transport', user: result.insertedId },
        { name: 'Salary', user: result.insertedId },
        { name: 'Investment', user: result.insertedId }
    ])

    addNotification("🎉 Welcome to FinTrack! Your account has been successfully created. Start tracking your finances and take control of your goals."
        , result.insertedId)

    const token = jwt.sign({ userId: result.insertedId }, process.env.JWT_SECRET, { expiresIn: '7d' })
    res.json({ token })
})


export default router