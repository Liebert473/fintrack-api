import express from 'express';
const router = express.Router()
import connectDB from '../../db.js';
import dotenv from 'dotenv';

dotenv.config();

router.post('/api/auth/register', async (req, res) => {
    const { email, password, name, username } = req.body
    if (!email || !password || !name || !username) return res.status(400).json({ error: 'Some reqired information are missing.' })

    const db = await connectDB()
    const user = await db.collection('users').findOne({ email })
    if (user) return res.status(409).json({ error: 'User already exists.' })

    const passwordHash = await bcrypt.hash(password, 10)
    const result = await db.collection('users').insertOne({
        email,
        username,
        name,
        passwordHash,
        createdAt: new Date()
    })

    const token = jwt.sign({ userId: result.insertedId }, process.env.JWT_SECRET, { expiresIn: '7d' })
    res.json({ token })
})

export default router