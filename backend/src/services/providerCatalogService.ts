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
            { time: '10:00 AM', isBooked: false },
            { time: '12:30 PM', isBooked: false },
            { time: '05:00 PM', isBooked: false },
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
            { time: '09:30 AM', isBooked: false },
            { time: '01:00 PM', isBooked: false },
            { time: '06:30 PM', isBooked: false },
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
            { time: '11:00 AM', isBooked: false },
            { time: '03:00 PM', isBooked: false },
            { time: '07:00 PM', isBooked: false },
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

  addProviderAvailabilitySlot(doctorId, '10:00 AM');
  addProviderAvailabilitySlot(doctorId, '01:00 PM');
  addProviderAvailabilitySlot(doctorId, '05:00 PM');
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
          { "time": "10:00 AM", "isBooked": false }
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

  if (cached && Date.now() - cached.updatedAt < CACHE_TTL_MS) {
    return cached.providers;
  }

  let providers: Provider[];
  try {
    const [generatedProviders, registeredProviders] = await Promise.all([
      generateProvidersWithGemini(specialist, location),
      getRegisteredProviders(specialist, location),
    ]);

    providers = [...registeredProviders, ...generatedProviders];
  } catch (error) {
    console.error('Provider generation error:', error);
    providers = [
      ...(await getRegisteredProviders(specialist, location)),
      ...defaultProviders(specialist, location),
    ];
  }

  providerCache.set(cacheKey, {
    providers,
    updatedAt: Date.now(),
  });

  return providers;
};

export const bookProviderSlot = async (params: {
  providerId: string;
  doctorId: string;
  time: string;
  specialist: string;
  location: string;
  patientId?: string;
  patientName: string;
  reason: string;
}) => {
  const { providerId, doctorId, time, specialist, location, patientId, patientName, reason } = params;
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

  const slot = doctor.availability.find((item) => item.time === time);
  if (!slot) {
    throw new Error('Slot not found');
  }

  if (slot.isBooked) {
    throw new Error('Slot already booked');
  }

  slot.isBooked = true;
  if (doctor.linkedUserId) {
    markProviderAvailabilityBooked(doctor.linkedUserId, time);
    await createProviderAppointment(doctor.linkedUserId, {
      patientId,
      patientName,
      providerName: provider.name,
      reason,
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
    time: slot.time,
    isBooked: slot.isBooked,
  };
};
