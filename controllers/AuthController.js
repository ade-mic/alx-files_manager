import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AuthController {
  static async getConnect(req, res) {
    try {
      // Extract and decode Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Basic ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const encodedCredentials = authHeader.split(' ')[1];
      const decodedCredentials = Buffer.from(encodedCredentials, 'base64').toString('utf-8');
      const [email, password] = decodedCredentials.split(':');

      // Check if credentials are provided
      if (!email || !password) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Find user in database
      const hashedPassword = sha1(password);
      const usersCollection = await dbClient.collection('users');
      const user = await usersCollection.findOne({ email, password: hashedPassword });

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Generate a token and store it in Redis
      const token = uuidv4();
      const redisKey = `auth_${token}`;
      await redisClient.set(redisKey, user._id.toString(), 24 * 60 * 60); // Store for 24 hours

      return res.status(200).json({ token: token.toString() });
    } catch (error) {
      console.error('Error during connect:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getDisconnect(req, res) {
    try {
      // Retrieve the token from the headers
      const token = req.headers['x-token'];
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Delete the token from Redis
      const redisKey = `auth_${token}`;
      const deleted = await redisClient.del(redisKey);

      if (deleted === 0) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      return res.status(204).send();
    } catch (error) {
      console.error('Error during disconnect:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default AuthController;
