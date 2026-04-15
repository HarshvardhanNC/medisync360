import { Provider } from '../services/providerCatalogService';

type RankedDoctor = {
  providerId: string;
  providerName: string;
  doctorId: string;
  name: string;
  rating: number;
  experience: number;
  fees: number;
  location: string;
  score: number;
  availability: Array<{ time: string; isBooked: boolean }>;
};

const getDistanceScore = (providerLocation: string, userLocation?: string): number => {
  if (!userLocation) {
    return 0.5;
  }

  return providerLocation.trim().toLowerCase() === userLocation.trim().toLowerCase() ? 1 : 0.5;
};

const getCostScore = (fees: number): number => {
  if (fees <= 0) {
    return 0;
  }

  return 1 / fees;
};

export const rankDoctorsFromProviders = (
  providers: Provider[],
  specialist: string,
  userLocation?: string,
): RankedDoctor[] => {
  return providers
    .flatMap((provider) =>
      provider.doctors
        .filter((doctor) => doctor.specialization === specialist)
        .map((doctor) => {
          const distanceScore = getDistanceScore(provider.location, userLocation);
          const costScore = getCostScore(doctor.fees);
          const score =
            0.4 * provider.rating +
            0.3 * doctor.experience +
            0.2 * distanceScore +
            0.1 * costScore;

          return {
            providerId: provider.id,
            providerName: provider.name,
            doctorId: doctor.id,
            name: doctor.name,
            rating: provider.rating,
            experience: doctor.experience,
            fees: doctor.fees,
            location: provider.location,
            score: Number(score.toFixed(4)),
            availability: doctor.availability,
          };
        }),
    )
    .sort((a, b) => b.score - a.score);
};

export const summarizeProvidersForCards = (providers: Provider[]) => {
  return providers
    .map((provider) => {
      const averageFees =
        provider.doctors.reduce((total, doctor) => total + doctor.fees, 0) / provider.doctors.length;
      const averageExperience =
        provider.doctors.reduce((total, doctor) => total + doctor.experience, 0) / provider.doctors.length;

      return {
        id: provider.id,
        type: provider.type,
        name: provider.name,
        location: provider.location,
        treatmentCostRange: `INR ${Math.round(averageFees * 0.8)} - ${Math.round(averageFees * 1.3)}`,
        rating: provider.rating,
        doctorExperienceAvgYears: Number(averageExperience.toFixed(1)),
        insuranceCompatibility: ['Star Health', 'Niva Bupa', 'HDFC ERGO'],
        emergencyServices: provider.type === 'hospital',
        doctors: provider.doctors,
      };
    })
    .sort((a, b) => b.rating - a.rating);
};
