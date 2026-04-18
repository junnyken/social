const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: parseInt(process.env.MONGODB_POOL_SIZE) || 10,
      retryWrites: true,
      w: 'majority'
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Create indexes
    await createIndexes();

    return conn;

  } catch (error) {
    console.error(`❌ MongoDB connection failed:`, error);
    process.exit(1);
  }
};

async function createIndexes() {
  try {
    // User indexes
    mongoose.model('User').collection.createIndex({ email: 1 }, { unique: true });
    mongoose.model('User').collection.createIndex({ googleId: 1 });
    mongoose.model('User').collection.createIndex({ facebookId: 1 });
    mongoose.model('User').collection.createIndex({ linkedinId: 1 });

    // Post indexes
    mongoose.model('Post').collection.createIndex({ userId: 1, createdAt: -1 });
    mongoose.model('Post').collection.createIndex({ workspaceId: 1 });
    mongoose.model('Post').collection.createIndex({ status: 1 });
    mongoose.model('Post').collection.createIndex({ scheduledAt: 1 });

    console.log('✅ Database indexes created');

  } catch (error) {
    console.error('Index creation failed:', error);
  }
}

module.exports = { connectDB };
