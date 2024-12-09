import crypto from 'crypto';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import { use } from 'chai';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    // Check for missing email
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    // Check for missing password
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    const usersCollection = dbClient.client.collection('users');

    // Check if the email already exists in the database
    const userExists = await usersCollection.findOne({ email });
    if (userExists) {
      return res.status(400).json({ error: 'Already exist' });
    }

    // Hash the password using SHA1
    const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');

    // Insert the new user into the database
    const result = await usersCollection.insertOne({ email, password: hashedPassword });

    // Return the newly created user (with id and email only)
    return res.status(201).json({
      id: result.insertedId.toString(),
      email,
    });
  }

  static async getMe(req, res) {
    const token = req.header['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unathorized'});
    }
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized'})
    }

    const user = await dbClient.getUserById(userId);
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized'
      })
    }
    return res.status(200).json({ id: user._id, email: user.email })
  }
}

export default UsersController;
