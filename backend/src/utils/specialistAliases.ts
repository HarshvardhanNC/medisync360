const specialistAliases: Record<string, string> = {
  'General Practitioner': 'General Physician',
  'General Doctor': 'General Physician',
  GP: 'General Physician',
  ENT: 'ENT Specialist',
  'Rheumatologist / Orthopedist': 'Rheumatologist',
  Rheumatology: 'Rheumatologist',
  Orthopedist: 'Rheumatologist',
};

export const normalizeSpecialist = (specialist?: string | null): string | null => {
  if (!specialist) {
    return null;
  }

  return specialistAliases[specialist] ?? specialist;
};
