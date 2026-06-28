import type { Connection } from 'mongoose';

export default {
  id: '20260628-backfill-user-fname-lname',
  async up(connection: Connection): Promise<void> {
    const users = connection.collection('users');
    const cursor = users.find({
      $or: [{ fname: { $exists: false } }, { lname: { $exists: false } }],
    });
    for await (const user of cursor) {
      const fullName = typeof user.name === 'string' ? user.name.trim() : '';
      const [firstName = 'Blipzo', ...rest] = fullName.split(/\s+/).filter(Boolean);
      await users.updateOne(
        { _id: user._id },
        {
          $set: {
            fname: user.fname ?? firstName,
            lname: user.lname ?? (rest.join(' ') || 'User'),
          },
        },
      );
    }
  },
  async down(): Promise<void> {
    // Non-destructive rollback: keep backfilled names.
  },
};
