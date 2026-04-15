import app from './app';
import { connectDB } from './config/db';
import { env } from './config/env';

const startServer = async (): Promise<void> => {
  try {
    await connectDB();

    app.listen(env.port, () => {
      console.log(`Server running in ${env.nodeEnv} mode on port ${env.port}`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
};

void startServer();
