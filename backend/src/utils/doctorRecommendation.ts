const doctors = require('../data/doctors.js') as Array<{
  id: string;
  name: string;
  specialization: string;
  experience: number;
  location: string;
  fees: number;
  rating: number;
  availability: Array<{ date: string; time: string }>;
}>;

const specialistMap = require('./specialistMap.js') as Record<string, string>;

type PredictionResult = {
  predictedCondition?: string;
  diseases?: Array<{ name: string; probability?: number }>;
};

type RankedDoctor = {
  name: string;
  rating: number;
  experience: number;
  fees: number;
  location: string;
  score: number;
};

const calculateDistanceScore = (doctorLocation: string, userLocation?: string): number => {
  if (!userLocation) {
    return 0.5;
  }

  return doctorLocation.toLowerCase() === userLocation.toLowerCase() ? 1 : 0.5;
};

const calculateCostScore = (fees: number): number => {
  if (fees <= 0) {
    return 0;
  }

  return 1 / fees;
};

export const extractTopDisease = (prediction: PredictionResult): string | null => {
  if (prediction.predictedCondition) {
    return prediction.predictedCondition;
  }

  if (prediction.diseases && prediction.diseases.length > 0) {
    return prediction.diseases
      .slice()
      .sort((a, b) => (b.probability ?? 0) - (a.probability ?? 0))[0].name;
  }

  return null;
};

export const getSpecialistForDisease = (disease: string): string | null => {
  return specialistMap[disease] ?? null;
};

export const getRankedDoctorsForSpecialist = (
  specialist: string,
  userLocation?: string,
): RankedDoctor[] => {
  return doctors
    .filter((doctor) => doctor.specialization === specialist)
    .map((doctor) => {
      const distanceScore = calculateDistanceScore(doctor.location, userLocation);
      const costScore = calculateCostScore(doctor.fees);
      const score =
        0.4 * doctor.rating +
        0.3 * doctor.experience +
        0.2 * distanceScore +
        0.1 * costScore;

      return {
        name: doctor.name,
        rating: doctor.rating,
        experience: doctor.experience,
        fees: doctor.fees,
        location: doctor.location,
        score: Number(score.toFixed(4)),
      };
    })
    .sort((a, b) => b.score - a.score);
};
