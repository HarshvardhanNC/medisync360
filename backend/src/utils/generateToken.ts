import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { UserRole } from '../models/User';

export const generateToken = (userId: string, role: UserRole): string => {
  return jwt.sign({ sub: userId, role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'],
  });
};
