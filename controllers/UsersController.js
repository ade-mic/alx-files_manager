import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class UsersController {
  /**
   *
   * create doc for this code import sha1 from 'sha1';
   *
   *Sure, here's the documentation for your UsersController class:

   *UsersController.js
   *The UsersController class handles user-related operations,
   * including user registration and retrieving user
   *Methods
   *postNew(req, res)

   *Description: Registers a new user by email and password.

   *Parameters:

   *req: The HTTP request object. Expects req.body to contain email and password.

   *res: The HTTP response object.

   *Response:

   *Returns a 201 status code with the user's id and email if the user is successfully created.

   *Returns a 400 status code if email or password is missing, or if the user already exists.

   *Returns a 500 status code if an internal server error occurs.
   */
  static async postNew(req, res) {
    /**
     *    *postNew(req, res)

   *Description: Registers a new user by email and password.

   *Parameters:

   *req: The HTTP request object. Expects req.body to contain email and password.

   *res: The HTTP response object.

   *Response:

   *Returns a 201 status code with the user's id and email if the user is successfully created.

   *Returns a 400 status code if email or password is missing, or if the user already exists.

   *Returns a 500 status code if an internal server error occurs.
   */

    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    try {
      const usersCollection = await dbClient.collection('users');
      const existingUser = await usersCollection.findOne({ email });

      if (existingUser) {
        return res.status(400).json({ error: 'Already exist' });
      }

      const hashedPassword = sha1(password);
      const result = await usersCollection.insertOne({ email, password: hashedPassword });

      return res.status(201).json({ id: result.insertedId.toString(), email });
    } catch (error) {
      console.error('Error handling request:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
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
