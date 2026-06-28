export default () => ({
  database: {
    uri: process.env.MONGO_URI ?? 'mongodb://localhost:27017/blipzo',
    autoIndex: process.env.MONGO_AUTO_INDEX === 'true',
  },
});
