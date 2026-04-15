import { connectDB } from '../config/db';
import User from '../models/User';

const doctors = [
  {
    name: 'Dr. Aisha Mehta',
    email: 'gp.mumbai@medisync360.test',
    password: 'Doctor@123',
    role: 'doctor' as const,
    isApproved: true,
    specialization: ['General Physician'],
    experienceYears: 12,
    consultationFee: 900,
    location: 'Mumbai',
  },
  {
    name: 'Dr. Rohan Kulkarni',
    email: 'neuro.mumbai@medisync360.test',
    password: 'Doctor@123',
    role: 'doctor' as const,
    isApproved: true,
    specialization: ['Neurologist'],
    experienceYears: 14,
    consultationFee: 1600,
    location: 'Mumbai',
  },
  {
    name: 'Dr. Neha Sharma',
    email: 'cardio.mumbai@medisync360.test',
    password: 'Doctor@123',
    role: 'doctor' as const,
    isApproved: true,
    specialization: ['Cardiologist'],
    experienceYears: 15,
    consultationFee: 1800,
    location: 'Mumbai',
  },
  {
    name: 'Dr. Arjun Nair',
    email: 'pulmo.mumbai@medisync360.test',
    password: 'Doctor@123',
    role: 'doctor' as const,
    isApproved: true,
    specialization: ['Pulmonologist'],
    experienceYears: 11,
    consultationFee: 1400,
    location: 'Mumbai',
  },
  {
    name: 'Dr. Kavya Deshpande',
    email: 'ent.mumbai@medisync360.test',
    password: 'Doctor@123',
    role: 'doctor' as const,
    isApproved: true,
    specialization: ['ENT Specialist'],
    experienceYears: 10,
    consultationFee: 1000,
    location: 'Mumbai',
  },
];

const run = async () => {
  await connectDB();

  for (const doctor of doctors) {
    const existing = await User.findOne({ email: doctor.email });

    if (existing) {
      existing.name = doctor.name;
      existing.role = doctor.role;
      existing.isApproved = doctor.isApproved;
      existing.specialization = doctor.specialization;
      existing.experienceYears = doctor.experienceYears;
      existing.consultationFee = doctor.consultationFee;
      existing.location = doctor.location;
      existing.password = doctor.password;
      await existing.save();
      console.log(`Updated doctor: ${doctor.email}`);
      continue;
    }

    await User.create(doctor);
    console.log(`Created doctor: ${doctor.email}`);
  }

  process.exit(0);
};

void run().catch((error) => {
  console.error('Failed to seed Mumbai doctors', error);
  process.exit(1);
});
