export interface LaymanInfo {
  simplified: string;
  shortSummary: string;
}

export const LAYMAN_CONDITION_MAP: Record<string, LaymanInfo> = {
  'Osteoarthristis': {
    simplified: 'Joint Wear & Tear (Cartilage Breakdown)',
    shortSummary: 'The protective cushion (cartilage) at the ends of your joints has worn down over time, causing joint stiffness, swelling, and pain during movement.',
  },
  'Osteoarthritis': {
    simplified: 'Joint Wear & Tear (Cartilage Breakdown)',
    shortSummary: 'The protective cushion (cartilage) at the ends of your joints has worn down over time, causing joint stiffness, swelling, and pain during movement.',
  },
  'GERD': {
    simplified: 'Chronic Acid Reflux & Heartburn',
    shortSummary: 'Stomach acid flows back up into your food pipe (esophagus), causing a burning sensation in your chest, throat, or upper stomach.',
  },
  'Common Cold': {
    simplified: 'Head Cold / Viral Nose & Throat Infection',
    shortSummary: 'A mild viral infection of your nose and upper throat causing sneezing, runny nose, stuffy congestion, or mild throat soreness.',
  },
  'Paroymsal Positional Vertigo': {
    simplified: 'Inner Ear Dizziness & Balance Disorder',
    shortSummary: 'Tiny calcium crystals in your inner ear shift out of position, causing brief episodes of spinning dizziness when you move your head.',
  },
  '(vertigo) Paroymsal  Positional Vertigo': {
    simplified: 'Inner Ear Dizziness & Balance Disorder',
    shortSummary: 'Tiny calcium crystals in your inner ear shift out of position, causing brief episodes of spinning dizziness when you move your head.',
  },
  'Cervical spondylosis': {
    simplified: 'Neck Disk Age-Related Wear & Pain',
    shortSummary: 'Wear-and-tear affecting the disks and joints in your neck, leading to neck stiffness, persistent aches, or radiating shoulder pain.',
  },
  'Dimorphic hemmorhoids(piles)': {
    simplified: 'Swollen Veins in Anal Area (Piles)',
    shortSummary: 'Swollen or inflamed blood vessels around your lower rectum or anus, which can cause pain, itching, discomfort, or mild bleeding.',
  },
  'Dimorphic hemorrhoids(piles)': {
    simplified: 'Swollen Veins in Anal Area (Piles)',
    shortSummary: 'Swollen or inflamed blood vessels around your lower rectum or anus, which can cause pain, itching, discomfort, or mild bleeding.',
  },
  'Ear Infection': {
    simplified: 'Middle / Outer Ear Inflammation',
    shortSummary: 'Fluid buildup or bacterial infection behind the eardrum or in the ear canal, causing ear pain, pressure, or irritation.',
  },
  'Gastroenteritis': {
    simplified: 'Stomach Flu / Intestinal Inflammation',
    shortSummary: 'An infection of your stomach and intestines causing watery diarrhea, stomach cramps, nausea, vomiting, or low fever.',
  },
  'Bronchial Asthma': {
    simplified: 'Airway Swelling & Wheezing Tightness',
    shortSummary: 'Lung airways become inflamed and narrow, producing extra mucus that leads to breathing difficulty, chest tightness, or wheezing.',
  },
  'Hypertension': {
    simplified: 'High Blood Pressure',
    shortSummary: 'The force of blood against your artery walls is consistently too high, putting extra strain on your heart and circulation.',
  },
  'Hypertension ': {
    simplified: 'High Blood Pressure',
    shortSummary: 'The force of blood against your artery walls is consistently too high, putting extra strain on your heart and circulation.',
  },
  'Hypoglycemia': {
    simplified: 'Low Blood Sugar Level',
    shortSummary: 'Your blood glucose level drops too low, causing shakiness, sweating, dizziness, rapid heart rate, or sudden weakness.',
  },
  'Urinary tract infection': {
    simplified: 'Bladder / Urinary Tract Infection (UTI)',
    shortSummary: 'A bacterial infection in your bladder or urinary tract causing a frequent, urgent need to pee and a burning feeling when urinating.',
  },
  'Pneumonia': {
    simplified: 'Deep Lung Infection / Fluid in Lungs',
    shortSummary: 'An infection in one or both lungs that inflames the air sacs and fills them with fluid, causing fever, chest pain, and deep coughing.',
  },
  'Psoriasis': {
    simplified: 'Scaly Red Skin Patches',
    shortSummary: 'An overactive skin response where skin cells build up quickly, forming thick, red, scaly, and itchy skin patches.',
  },
  'Acne': {
    simplified: 'Skin Pimples & Pores Blockage',
    shortSummary: 'Oil and dead skin cells plug your hair follicles, leading to pimples, blackheads, whiteheads, or tender red bumps.',
  },
  'Migraine': {
    simplified: 'Severe Pulsating Headache',
    shortSummary: 'An intense, throbbing headache usually on one side of the head, often accompanied by sensitivity to light, sound, or nausea.',
  },
  'Heart attack': {
    simplified: 'Blocked Blood Flow to Heart (Emergency)',
    shortSummary: 'Blood supply to part of the heart muscle is severely reduced or blocked, causing heavy chest pressure, squeezing pain, or shortness of breath.',
  },
  'Diabetes': {
    simplified: 'High Blood Sugar Condition',
    shortSummary: 'Your body cannot properly convert blood glucose into energy, resulting in elevated blood sugar levels, thirst, and frequent urination.',
  },
  'Diabetes ': {
    simplified: 'High Blood Sugar Condition',
    shortSummary: 'Your body cannot properly convert blood glucose into energy, resulting in elevated blood sugar levels, thirst, and frequent urination.',
  },
  'Jaundice': {
    simplified: 'Yellowing of Eyes & Skin (Liver Strain)',
    shortSummary: 'Yellow pigment (bilirubin) accumulates in your skin and eyes due to temporary liver or bile duct stress.',
  },
  'Dengue': {
    simplified: 'Mosquito-Borne High Fever & Joint Aches',
    shortSummary: 'A viral infection transmitted by mosquitoes causing sudden high fever, severe eye/muscle pain, skin rash, and extreme fatigue.',
  },
  'Malaria': {
    simplified: 'Mosquito-Borne Parasite Fever & Chills',
    shortSummary: 'A parasite infection spread by mosquitoes causing repeating cycles of high fever, severe shaking chills, and sweating.',
  },
  'Typhoid': {
    simplified: 'Bacterial Digestive System Fever',
    shortSummary: 'A bacterial infection causing prolonged fever, stomach weakness, headache, abdominal pain, and tiredness.',
  },
  'Fungal infection': {
    simplified: 'Skin Fungus / Ringworm Rash',
    shortSummary: 'Microscopic skin fungi multiply on the skin surface, producing red, itchy, scaly, or circular skin patches.',
  },
  'Allergy': {
    simplified: 'Immune System Reaction / Hypersensitivity',
    shortSummary: 'Your body overreacts to a harmless substance (like dust, pollen, or food), causing sneezing, itching, watery eyes, or rash.',
  },
  'Sinusitis': {
    simplified: 'Sinus Pressure & Nasal Blockage',
    shortSummary: 'Inflammatory swelling in your sinus passages causing facial pressure, headache, stuffed nose, or thick nasal mucus.',
  },
  'Tuberculosis': {
    simplified: 'Chronic Bacterial Lung Disease',
    shortSummary: 'A bacterial infection affecting the lungs that causes persistent cough, night chills, unexplained weight loss, and fever.',
  },
  'Chicken pox': {
    simplified: 'Contagious Itchy Blister Rash',
    shortSummary: 'A viral infection causing itchy, fluid-filled red spots and blisters over the body along with fever and body aches.',
  },
  'Hypothyroidism': {
    simplified: 'Underactive Thyroid (Slow Metabolism)',
    shortSummary: 'Your thyroid gland produces too little hormone, leading to weight gain, tiredness, feeling cold, and dry skin.',
  },
  'Hyperthyroidism': {
    simplified: 'Overactive Thyroid (Fast Metabolism)',
    shortSummary: 'Your thyroid gland produces too much hormone, accelerating metabolism and causing fast heartbeat, weight loss, and nervousness.',
  },
  'Varicose veins': {
    simplified: 'Swollen & Twisted Leg Veins',
    shortSummary: 'Veins in your legs become enlarged or swollen due to pressure, appearing as visible, bulging blue blood vessels.',
  },
  'Peptic ulcer diseae': {
    simplified: 'Stomach / Intestine Lining Ulcer',
    shortSummary: 'A sore or break in the protective lining of your stomach or upper intestine causing burning stomach pain after eating.',
  },
  'Chronic cholestasis': {
    simplified: 'Impaired Liver Bile Flow',
    shortSummary: 'Bile fluid flow from your liver is reduced, leading to persistent skin itching, jaundice, and digestive discomfort.',
  },
  'Drug Reaction': {
    simplified: 'Medication Allergy / Skin Rash',
    shortSummary: 'An unexpected skin rash, itching, or swelling caused by a medicine or drug.',
  },
  'hepatitis A': {
    simplified: 'Viral Liver Inflammation (Type A)',
    shortSummary: 'A temporary liver infection causing tiredness, nausea, loss of appetite, and mild yellowing of eyes or skin.',
  },
  'Hepatitis B': {
    simplified: 'Viral Liver Infection (Type B)',
    shortSummary: 'A viral infection affecting the liver causing tiredness, abdominal ache, and dark urine.',
  },
  'Hepatitis C': {
    simplified: 'Viral Liver Infection (Type C)',
    shortSummary: 'A viral liver infection that affects liver function over time.',
  },
  'Hepatitis D': {
    simplified: 'Viral Liver Infection (Type D)',
    shortSummary: 'A liver virus infection that occurs alongside Hepatitis B.',
  },
  'Hepatitis E': {
    simplified: 'Viral Liver Infection (Type E)',
    shortSummary: 'A water-borne liver infection causing temporary fatigue, nausea, and jaundice.',
  },
  'Alcoholic hepatitis': {
    simplified: 'Alcohol-Related Liver Inflammation',
    shortSummary: 'Liver swelling and stress caused by heavy or continuous alcohol consumption.',
  },
  'Paralysis (brain hemorrhage)': {
    simplified: 'Stroke / Brain Bleed Paralysis',
    shortSummary: 'A sudden burst blood vessel in the brain causing muscle weakness, numbness, or loss of movement on one side of the body.',
  },
};

export const getLaymanInfo = (condition?: string | null): LaymanInfo => {
  if (!condition) {
    return {
      simplified: 'Medical Condition',
      shortSummary: 'A health condition evaluated by clinical triage algorithms.',
    };
  }

  const key = condition.trim();
  const found = LAYMAN_CONDITION_MAP[key];

  if (found) {
    return found;
  }

  return {
    simplified: key,
    shortSummary: `Clinical evaluation for ${key}. Please review your symptoms with a qualified medical specialist.`,
  };
};
