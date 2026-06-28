import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { UserSchema } from '../../src/modules/users/schemas/user.schema';

describe('User repository integration shape', () => {
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    mongoose.model('User', UserSchema);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  it('creates a user document', async () => {
    const User = mongoose.model('User');
    const user = await User.create({
      fname: 'Test',
      lname: 'User',
      email: 'int@example.com',
      password: 'hash',
    });
    expect(user.email).toBe('int@example.com');
  });
});
