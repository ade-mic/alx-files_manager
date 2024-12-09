import dbClient from '../utils/db';

describe('dbClient', () => {
  it('should connect to the database', () => {
    expect(dbClient.isAlive()).toBe(true);
  });

  it('should find a user by email', async () => {
    const user = await dbClient.getUserByEmail('example@example.com');
    expect(user).toBeDefined();
    expect(user.email).toBe('example@example.com');
  });
});
