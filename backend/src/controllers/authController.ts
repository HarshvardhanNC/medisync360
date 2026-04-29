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
  phoneNumber?: string;
  specialization?: string[];
  experienceYears?: number;
  consultationFee?: number;
  location?: string;
  bloodGroup?: string;
  allergies?: string[];
  chronicDiseases?: string[];
  currentMedications?: string[];
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  emergencyConsent?: boolean;
}) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  role: user.role,
  isApproved: user.isApproved,
  phoneNumber: user.phoneNumber,
  specialization: user.specialization,
  experienceYears: user.experienceYears,
  consultationFee: user.consultationFee,
  location: user.location,
  bloodGroup: user.bloodGroup,
  allergies: user.allergies,
  chronicDiseases: user.chronicDiseases,
  currentMedications: user.currentMedications,
  emergencyContactName: user.emergencyContactName,
  emergencyContactPhone: user.emergencyContactPhone,
  insuranceProvider: user.insuranceProvider,
  insurancePolicyNumber: user.insurancePolicyNumber,
  emergencyConsent: user.emergencyConsent,
});

export const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role, specialization, experienceYears, consultationFee, location } = req.body as {
    name?: string;
    email?: string;
    password?: string;
    role?: UserRole;
    specialization?: string[];
    experienceYears?: number;
    consultationFee?: number;
    location?: string;
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
    specialization: userRole === 'doctor' ? specialization : undefined,
    experienceYears: userRole === 'doctor' ? experienceYears : undefined,
    consultationFee: userRole === 'doctor' ? consultationFee : undefined,
    location: userRole === 'doctor' ? location : undefined,
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
