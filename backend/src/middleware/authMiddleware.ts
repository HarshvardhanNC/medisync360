import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { IUserDocument, User, UserRole } from '../models/User';
import { ApiError } from '../utils/apiError';
import { asyncHandler } from '../utils/asyncHandler';

interface JwtPayload {
  sub: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: IUserDocument;
}

export const protect = asyncHandler(async (req: AuthRequest, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new ApiError(401, 'Authorization token is required');
  }

  const token = authHeader.split(' ')[1];
  const decoded = jwt.verify(token, env.jwtSecret) as JwtPayload;

  const user = (await User.findById(decoded.sub).select('+password')) as IUserDocument | null;
  if (!user) {
    throw new ApiError(401, 'User not found for the provided token');
  }

  req.user = user;
  next();
});

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ApiError(401, 'Authentication required'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new ApiError(403, 'You do not have permission to access this resource'));
      return;
    }

    next();
  };
};

export const isAdmin = authorize('admin');
export const isDoctor = authorize('doctor');
