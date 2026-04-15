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

  if ((error as NodeJS.ErrnoException).name === 'JsonWebTokenError') {
    res.status(401).json({ message: 'Invalid token' });
    return;
  }

  console.error(error);
  res.status(500).json({ message: 'Internal server error' });
};
