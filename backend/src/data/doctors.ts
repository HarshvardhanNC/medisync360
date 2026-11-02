export interface DoctorAvailability {
  date: string;
  time: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialization: string;
  experience: number;
  location: string;
  fees: number;
  rating: number;
  availability: DoctorAvailability[];
}

export const doctors: Doctor[] = [
  {
    id: 'doc-001',
    name: 'Dr. Ananya Mehta',
    specialization: 'General Physician',
    experience: 11,
    location: 'Mumbai',
    fees: 600,
    rating: 4.7,
    availability: [
      { date: '2026-04-16', time: '10:00 AM' },
      { date: '2026-04-16', time: '12:30 PM' },
      { date: '2026-04-17', time: '05:00 PM' },
    ],
  },
  {
    id: 'doc-002',
    name: 'Dr. Rohan Kulkarni',
    specialization: 'Neurologist',
    experience: 14,
    location: 'Pune',
    fees: 1200,
    rating: 4.8,
    availability: [
      { date: '2026-04-16', time: '11:00 AM' },
      { date: '2026-04-17', time: '03:00 PM' },
      { date: '2026-04-18', time: '06:30 PM' },
    ],
  },
  {
    id: 'doc-003',
    name: 'Dr. Sneha Iyer',
    specialization: 'Cardiologist',
    experience: 16,
    location: 'Bengaluru',
    fees: 1500,
    rating: 4.9,
    availability: [
      { date: '2026-04-16', time: '09:30 AM' },
      { date: '2026-04-17', time: '01:00 PM' },
      { date: '2026-04-19', time: '04:30 PM' },
    ],
  },
  {
    id: 'doc-004',
    name: 'Dr. Vivek Sharma',
    specialization: 'Dermatologist',
    experience: 9,
    location: 'Delhi',
    fees: 900,
    rating: 4.6,
    availability: [
      { date: '2026-04-16', time: '02:00 PM' },
      { date: '2026-04-18', time: '11:30 AM' },
      { date: '2026-04-20', time: '04:00 PM' },
    ],
  },
  {
    id: 'doc-005',
    name: 'Dr. Pooja Nair',
    specialization: 'Pulmonologist',
    experience: 13,
    location: 'Chennai',
    fees: 1100,
    rating: 4.8,
    availability: [
      { date: '2026-04-16', time: '04:00 PM' },
      { date: '2026-04-17', time: '10:30 AM' },
      { date: '2026-04-19', time: '02:00 PM' },
    ],
  },
  {
    id: 'doc-006',
    name: 'Dr. Amit Patel',
    specialization: 'Orthopedic',
    experience: 18,
    location: 'Ahmedabad',
    fees: 1300,
    rating: 4.9,
    availability: [
      { date: '2026-04-17', time: '09:00 AM' },
      { date: '2026-04-18', time: '01:00 PM' },
      { date: '2026-04-20', time: '05:30 PM' },
    ],
  },
  {
    id: 'doc-007',
    name: 'Dr. Meera Joshi',
    specialization: 'ENT Specialist',
    experience: 8,
    location: 'Mumbai',
    fees: 800,
    rating: 4.5,
    availability: [
      { date: '2026-04-16', time: '03:30 PM' },
      { date: '2026-04-18', time: '10:00 AM' },
      { date: '2026-04-19', time: '12:00 PM' },
    ],
  },
  {
    id: 'doc-008',
    name: 'Dr. Nikhil Verma',
    specialization: 'Gastroenterologist',
    experience: 15,
    location: 'Delhi',
    fees: 1400,
    rating: 4.7,
    availability: [
      { date: '2026-04-17', time: '12:00 PM' },
      { date: '2026-04-18', time: '02:30 PM' },
      { date: '2026-04-19', time: '06:00 PM' },
    ],
  },
];

export default doctors;
