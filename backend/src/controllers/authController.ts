import { Request, Response } from 'express';
import { User, UserRole, USER_ROLES } from '../models/User';
import { ApiError } from '../utils/apiError';
import { asyncHandler } from '../utils/asyncHandler';
import { generateToken } from '../utils/generateToken';

const sanitizeUser = (user: {
  _id: unknown;
  name: string;
  email: string;
  role: UserRole;
  isApproved: boolean;
}) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  role: user.role,
  isApproved: user.isApproved,
});

export const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body as {
    name?: string;
    email?: string;
    password?: string;
    role?: UserRole;
  };

  if (!name || !email || !password) {
    throw new ApiError(400, 'Name, email, and password are required');
  }

  if (role && !USER_ROLES.includes(role)) {
    throw new ApiError(400, 'Invalid role provided');
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new ApiError(409, 'User already exists with this email');
  }

  const userRole: UserRole = role ?? 'patient';
  const user = await User.create({
    name,
    email,
    password,
    role: userRole,
    isApproved: userRole === 'patient',
  });

  const token = generateToken(String(user._id), user.role);

  res.status(201).json({
    message: 'User registered successfully',
    user: sanitizeUser(user),
    token,
  });
});

export const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = generateToken(String(user._id), user.role);

  res.status(200).json({
    message: 'Login successful',
    user: sanitizeUser(user),
    token,
  });
});
