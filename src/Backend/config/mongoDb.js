import mongoose from 'mongoose';

const classifyMongoConnectionError = (error = {}) => {
  const message = String(error?.message || '').toLowerCase();

  if (message.includes('ssl routines') || message.includes('tlsv1 alert')) {
    return 'TLS handshake failed. This is often Atlas network access/IP allowlist related. Confirm your current public IP is allowed in Atlas Network Access.';
  }

  if (message.includes('authentication failed') || message.includes('auth failed')) {
    return 'MongoDB authentication failed. Verify username/password in MONGODB_URI and URL-encode special password characters.';
  }

  if (message.includes('could not connect to any servers') || message.includes('server selection')) {
    return 'MongoDB server selection failed. Check Atlas cluster status, Network Access allowlist, and internet access.';
  }

  if (message.includes('querysrv') || message.includes('ename not found') || message.includes('dns')) {
    return 'DNS/SRV resolution failed for Atlas host. Check DNS settings and try switching networks.';
  }

  return 'Unknown MongoDB network/connectivity error. Check Atlas cluster status, network access allowlist, and credentials.';
};

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bus_system';
    
    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 30000,
      maxPoolSize: 20,
      minPoolSize: 2,
      maxIdleTimeMS: 300000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    console.error('ℹ️ MongoDB Hint:', classifyMongoConnectionError(error));
    return null;
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('✅ MongoDB Disconnected');
  } catch (error) {
    console.error('❌ MongoDB Disconnection Error:', error.message);
    process.exit(1);
  }
};

export { connectDB, disconnectDB };
