import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { ApiError } from '../utils/apiError';

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(new ApiError(404, `Route not found: ${req.originalUrl}`));
};

export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  if (error instanceof mongoose.Error.ValidationError) {
    res.status(400).json({
      message: 'Validation failed',
      errors: Object.values(error.errors).map((item) => item.message),
    });
    return;
  }

  // Handle all JWT-related errors (invalid signature, expired, malformed, etc.)
  const JWT_ERROR_NAMES = ['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'];
  if (JWT_ERROR_NAMES.includes((error as NodeJS.ErrnoException).name)) {
    res.status(401).json({ message: 'Token expired or invalid. Please log in again.' });
    return;
  }

  console.error(error);
  res.status(500).json({ message: 'Internal server error' });
};
