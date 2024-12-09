import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    const userCollection = await dbClient.collection('users');

    // Check if user already exists
    const existingUser = await userCollection.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Already exists' });
    }

    // Hash password (simple example)
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    // Create new user
    const newUser = {
      email,
      password: hashedPassword,
    };

    const result = await userCollection.insertOne(newUser);
    const userId = result.insertedId.toString();

    // Add job to the userQueue
    await userQueue.add({ userId });

    return res.status(201).json({ id: userId, email });
  }

  static async getMe(req, res) {
    /**
     * Retrieve the user based on the token:
     * If not found, return an error Unauthorized with a status code 401
     * Otherwise, return the user object (email and id only)
     */
    try {
      const token = req.headers['x-token'];

      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = await redisClient.get(`auth_${token}`);

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userCollection = await dbClient.collection('users');
      const user = await userCollection.findOne({ _id: new ObjectId(userId) });

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      return res.status(200).json({
        id: user._id.toString(),
        email: user.email,
      });
    } catch (error) {
      console.error('Error retrieving user:', error);
      return res.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  
}

export default UsersController;
