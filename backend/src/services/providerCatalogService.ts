import { GoogleGenerativeAI } from '@google/generative-ai';
import User from '../models/User';
import { normalizeSpecialist } from '../utils/specialistAliases';
import {
  addProviderAvailabilitySlot,
  createProviderAppointment,
  getProviderAvailability,
  markProviderAvailabilityBooked,
} from './providerWorkspaceService';

export type ProviderSlot = {
  id?: string;
  date: string;
  time: string;
  isBooked: boolean;
};

export type ProviderDoctor = {
  id: string;
  name: string;
  specialization: string;
  experience: number;
  fees: number;
  availability: ProviderSlot[];
  linkedUserId?: string;
};

export type Provider = {
  id: string;
  type: 'hospital' | 'clinic';
  name: string;
  location: string;
  rating: number;
  doctors: ProviderDoctor[];
};

type ProviderCacheValue = {
  providers: Provider[];
  updatedAt: number;
};

const providerCache = new Map<string, ProviderCacheValue>();
const CACHE_TTL_MS = 30 * 60 * 1000;
const getFutureDate = (offset: number): string => {
  const value = new Date();
  value.setDate(value.getDate() + offset);
  return value.toISOString().slice(0, 10);
};

const buildCacheKey = (specialist: string, location: string): string => {
  return `${specialist.trim().toLowerCase()}::${location.trim().toLowerCase()}`;
};

const defaultProviders = (specialist: string, location: string): Provider[] => {
  return [
    {
      id: 'p1',
      type: 'hospital',
      name: `${location} Advanced Care Hospital`,
      location,
      rating: 4.6,
      doctors: [
        {
          id: 'd1',
          name: `Dr. Aarav ${specialist.replace(/\s+/g, '')}`,
          specialization: specialist,
          experience: 14,
          fees: 1200,
          availability: [
            { date: getFutureDate(1), time: '10:00 AM', isBooked: false },
            { date: getFutureDate(1), time: '12:30 PM', isBooked: false },
            { date: getFutureDate(2), time: '05:00 PM', isBooked: false },
          ],
        },
      ],
    },
    {
      id: 'p2',
      type: 'clinic',
      name: `${location} Specialty Clinic`,
      location,
      rating: 4.3,
      doctors: [
        {
          id: 'd2',
          name: `Dr. Meera ${specialist.replace(/\s+/g, '')}`,
          specialization: specialist,
          experience: 10,
          fees: 800,
          availability: [
            { date: getFutureDate(1), time: '09:30 AM', isBooked: false },
            { date: getFutureDate(2), time: '01:00 PM', isBooked: false },
            { date: getFutureDate(2), time: '06:30 PM', isBooked: false },
          ],
        },
      ],
    },
    {
      id: 'p3',
      type: 'hospital',
      name: `${location} Multi-Speciality Center`,
      location,
      rating: 4.5,
      doctors: [
        {
          id: 'd3',
          name: `Dr. Rohan ${specialist.replace(/\s+/g, '')}`,
          specialization: specialist,
          experience: 12,
          fees: 1000,
          availability: [
            { date: getFutureDate(1), time: '11:00 AM', isBooked: false },
            { date: getFutureDate(3), time: '03:00 PM', isBooked: false },
            { date: getFutureDate(3), time: '07:00 PM', isBooked: false },
          ],
        },
      ],
    },
  ];
};

const getOrCreateRegisteredDoctorAvailability = (doctorId: string): ProviderSlot[] => {
  const existing = getProviderAvailability(doctorId);
  if (existing.length > 0) {
    return existing;
  }

  addProviderAvailabilitySlot(doctorId, getFutureDate(1), '10:00 AM');
  addProviderAvailabilitySlot(doctorId, getFutureDate(1), '01:00 PM');
  addProviderAvailabilitySlot(doctorId, getFutureDate(2), '05:00 PM');
  return getProviderAvailability(doctorId);
};

const getRegisteredProviders = async (specialist: string, location: string): Promise<Provider[]> => {
  const normalizedSpecialist = normalizeSpecialist(specialist) ?? specialist;
  const doctors = await User.find({
    role: 'doctor',
    specialization: normalizedSpecialist,
    $or: [{ location: { $exists: false } }, { location: { $regex: `^${location.trim()}$`, $options: 'i' } }],
  }).select('-password');

  return doctors.map((doctor) => ({
    id: `provider-user-${doctor._id}`,
    type: 'clinic' as const,
    name: `${doctor.name} Practice`,
    location: doctor.location ?? location,
    rating: 4.7,
    doctors: [
      {
        id: String(doctor._id),
        linkedUserId: String(doctor._id),
        name: doctor.name,
        specialization: doctor.specialization?.[0] ?? normalizedSpecialist,
        experience: doctor.experienceYears ?? 8,
        fees: doctor.consultationFee ?? 900,
        availability: getOrCreateRegisteredDoctorAvailability(String(doctor._id)),
      },
    ],
  }));
};

const safeJsonParse = (text: string): unknown => {
  const cleaned = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
  return JSON.parse(cleaned);
};

const normalizeProviders = (rawProviders: unknown, specialist: string, location: string): Provider[] => {
  if (!Array.isArray(rawProviders)) {
    throw new Error('Invalid provider data');
  }

  const normalized = rawProviders
    .map((provider, providerIndex) => {
      const current = provider as Record<string, unknown>;
      const doctors = Array.isArray(current.doctors) ? current.doctors : [];

      return {
        id: typeof current.id === 'string' ? current.id : `p${providerIndex + 1}`,
        type: current.type === 'clinic' ? 'clinic' : 'hospital',
        name:
          typeof current.name === 'string' && current.name.trim().length > 0
            ? current.name
            : `${location} Provider ${providerIndex + 1}`,
        location:
          typeof current.location === 'string' && current.location.trim().length > 0
            ? current.location
            : location,
        rating:
          typeof current.rating === 'number' && current.rating >= 3.5 && current.rating <= 5
            ? current.rating
            : 4.2,
        doctors: doctors.map((doctor, doctorIndex) => {
          const currentDoctor = doctor as Record<string, unknown>;
          const availability = Array.isArray(currentDoctor.availability)
            ? currentDoctor.availability
            : [];

          return {
            id:
              typeof currentDoctor.id === 'string'
                ? currentDoctor.id
                : `d${providerIndex + 1}${doctorIndex + 1}`,
            name:
              typeof currentDoctor.name === 'string' && currentDoctor.name.trim().length > 0
                ? currentDoctor.name
                : `Doctor ${doctorIndex + 1}`,
            specialization:
              typeof currentDoctor.specialization === 'string' &&
              currentDoctor.specialization.trim().length > 0
                ? currentDoctor.specialization
                : specialist,
            experience:
              typeof currentDoctor.experience === 'number' && currentDoctor.experience > 0
                ? currentDoctor.experience
                : 8,
            fees: typeof currentDoctor.fees === 'number' && currentDoctor.fees > 0 ? currentDoctor.fees : 900,
            availability: availability.map((slot) => {
              const currentSlot = slot as Record<string, unknown>;
              return {
                date:
                  typeof currentSlot.date === 'string' && currentSlot.date.trim().length > 0
                    ? currentSlot.date
                    : getFutureDate(1),
                time:
                  typeof currentSlot.time === 'string' && currentSlot.time.trim().length > 0
                    ? currentSlot.time
                    : '10:00 AM',
                isBooked: Boolean(currentSlot.isBooked),
              };
            }),
          };
        }),
      } satisfies Provider;
    })
    .filter((provider) => provider.doctors.length > 0);

  if (normalized.length === 0) {
    throw new Error('Invalid provider data');
  }

  return normalized;
};

const generateProvidersWithGemini = async (specialist: string, location: string): Promise<Provider[]> => {
  if (!process.env.GEMINI_API_KEY) {
    return defaultProviders(specialist, location);
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `
Generate a list of 5 healthcare providers in ${location} for ${specialist}.

Return ONLY JSON.

Format:
[
  {
    "id": "p1",
    "type": "hospital",
    "name": "",
    "location": "${location}",
    "rating": 4.5,
    "doctors": [
      {
        "id": "d1",
        "name": "",
        "specialization": "${specialist}",
        "experience": 10,
        "fees": 1000,
        "availability": [
          { "date": "${getFutureDate(1)}", "time": "10:00 AM", "isBooked": false },
          { "date": "${getFutureDate(1)}", "time": "01:00 PM", "isBooked": false },
          { "date": "${getFutureDate(2)}", "time": "05:00 PM", "isBooked": false }
        ]
      }
    ]
  }
]

Rules:
- type must be either "hospital" or "clinic"
- rating must be between 3.5 and 5
- generate 1 or 2 doctors per provider
- availability must contain 3 slots per doctor
- no explanation
- no markdown
`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  return normalizeProviders(safeJsonParse(text), specialist, location);
};

export const getProvidersForSpecialist = async (specialist: string, location: string): Promise<Provider[]> => {
  const cacheKey = buildCacheKey(specialist, location);
  const cached = providerCache.get(cacheKey);
  const registeredProviders = await getRegisteredProviders(specialist, location);

  if (cached && Date.now() - cached.updatedAt < CACHE_TTL_MS) {
    return [...registeredProviders, ...cached.providers];
  }

  let generatedProviders: Provider[];
  try {
    generatedProviders = await generateProvidersWithGemini(specialist, location);
  } catch (error) {
    console.error('Provider generation error:', error);
    generatedProviders = defaultProviders(specialist, location);
  }

  providerCache.set(cacheKey, {
    providers: generatedProviders,
    updatedAt: Date.now(),
  });

  return [...registeredProviders, ...generatedProviders];
};

export const bookProviderSlot = async (params: {
  providerId: string;
  doctorId: string;
  date: string;
  time: string;
  specialist: string;
  location: string;
  patientId?: string;
  patientName: string;
  reason: string;
}) => {
  const { providerId, doctorId, date, time, specialist, location, patientId, patientName, reason } = params;
  const cacheKey = buildCacheKey(specialist, location);
  const providers = await getProvidersForSpecialist(specialist, location);
  const provider = providers.find((item) => item.id === providerId);

  if (!provider) {
    throw new Error('Provider not found');
  }

  const doctor = provider.doctors.find((item) => item.id === doctorId);
  if (!doctor) {
    throw new Error('Doctor not found');
  }

  const slot = doctor.availability.find((item) => item.date === date && item.time === time);
  if (!slot) {
    throw new Error('Slot not found');
  }

  if (slot.isBooked) {
    throw new Error('Slot already booked');
  }

  slot.isBooked = true;
  if (doctor.linkedUserId) {
    markProviderAvailabilityBooked(doctor.linkedUserId, date, time);
    await createProviderAppointment(doctor.linkedUserId, {
      patientId,
      patientName,
      providerName: provider.name,
      reason,
      date,
      time,
    });
  }

  providerCache.set(cacheKey, {
    providers,
    updatedAt: Date.now(),
  });

  return {
    providerId: provider.id,
    providerName: provider.name,
    doctorId: doctor.id,
    doctorName: doctor.name,
    date: slot.date,
    time: slot.time,
    isBooked: slot.isBooked,
  };
};
