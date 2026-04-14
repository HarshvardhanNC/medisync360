import { CSVDataLoader } from './csvDataLoader';

interface MedicalCondition {
  name: string;
  symptoms: string[];
  description: string;
  precautions: string[];
  matchScore?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  specialist: string;
}

interface SymptomMapping {
  [key: string]: string[];
}

export class KaggleMedicalKnowledgeBase {
  private csvLoader: CSVDataLoader;
  private diseases: MedicalCondition[] = [];
  private symptomSeverity: Map<string, number>;
  private initialized = false;

  // Medical specialist mapping
  private specialistMapping: { [key: string]: string } = {
    'Fungal infection': 'Dermatologist',
    'Allergy': 'Allergist',
    'GERD': 'Gastroenterologist',
    'Chronic cholestasis': 'Hepatologist',
    'Drug Reaction': 'Emergency Medicine',
    'Peptic ulcer diseae': 'Gastroenterologist',
    'AIDS': 'Infectious Disease Specialist',
    'Diabetes': 'Endocrinologist',
    'Gastroenteritis': 'Gastroenterologist',
    'Bronchial Asthma': 'Pulmonologist',
    'Hypertension': 'Cardiologist',
    'Migraine': 'Neurologist',
    'Cervical spondylosis': 'Orthopedist',
    'Paralysis (brain hemorrhage)': 'Neurologist',
    'Jaundice': 'Hepatologist',
    'Malaria': 'Infectious Disease Specialist',
    'Chicken pox': 'Dermatologist',
    'Dengue': 'Infectious Disease Specialist',
    'Typhoid': 'Infectious Disease Specialist',
    'hepatitis A': 'Hepatologist',
    'Hepatitis B': 'Hepatologist',
    'Hepatitis C': 'Hepatologist',
    'Hepatitis D': 'Hepatologist',
    'Hepatitis E': 'Hepatologist',
    'Alcoholic hepatitis': 'Hepatologist',
    'Tuberculosis': 'Pulmonologist',
    'Common Cold': 'General Practitioner',
    'Pneumonia': 'Pulmonologist',
    'Dimorphic hemmorhoids(piles)': 'Proctologist',
    'Heart attack': 'Cardiologist',
    'Varicose veins': 'Vascular Surgeon',
    'Hypothyroidism': 'Endocrinologist',
    'Hyperthyroidism': 'Endocrinologist',
    'Hypoglycemia': 'Endocrinologist',
    'Osteoarthristis': 'Rheumatologist',
    'Arthritis': 'Rheumatologist',
    'Paroymsal Positional Vertigo': 'ENT Specialist',
    'Acne': 'Dermatologist',
    'Urinary tract infection': 'Urologist',
    'Psoriasis': 'Dermatologist',
    'Impetigo': 'Dermatologist'
  };

  // Critical conditions that require emergency care
  private criticalConditions = [
    'Heart attack',
    'Paralysis (brain hemorrhage)',
    'Drug Reaction',
    'hepatitis A',
    'Hepatitis B',
    'Malaria',
    'Dengue',
    'Typhoid'
  ];

  // Symptom synonyms for better matching
  private symptomSynonyms: SymptomMapping = {
    'stomach pain': ['abdominal pain', 'belly pain', 'tummy ache', 'gut pain'],
    'joint pain': ['arthritis', 'joint ache', 'stiff joints', 'joint stiffness'],
    'skin rash': ['rash', 'skin eruption', 'skin irritation'],
    'continuous sneezing': ['sneezing', 'frequent sneezing'],
    'muscle weakness': ['weakness', 'fatigue', 'tired'],
    'high fever': ['fever', 'high temperature', 'pyrexia'],
    'chest pain': ['heart pain', 'chest discomfort'],
    'shortness of breath': ['difficulty breathing', 'breathlessness'],
    'headache': ['head pain', 'migraine'],
    'nausea': ['feeling sick', 'queasy'],
    'vomiting': ['throwing up', 'puking'],
    'diarrhea': ['loose stool', 'watery stool'],
    'constipation': ['difficulty passing stool', 'hard stool'],
    'dizziness': ['lightheaded', 'vertigo'],
    'blurred vision': ['vision problems', 'unclear vision'],
    'weight loss': ['losing weight', 'unexplained weight loss']
  };

  constructor() {
    this.csvLoader = new CSVDataLoader();
    this.symptomSeverity = new Map();
  }

  // Initialize the knowledge base with CSV data
  private initialize() {
    if (this.initialized) return;

    try {
      // Load data from CSV files
      const diseaseData = this.csvLoader.loadDiseaseSymptomData();
      const descriptions = this.csvLoader.loadDiseaseDescriptions();
      const precautions = this.csvLoader.loadDiseasePrecautions();
      this.symptomSeverity = this.csvLoader.loadSymptomSeverity();

      // Build medical conditions
      this.diseases = diseaseData.map(record => {
        const severity = this.determineSeverity(record.disease, record.symptoms);
        
        return {
          name: record.disease,
          symptoms: record.symptoms,
          description: descriptions.get(record.disease) || `Medical condition: ${record.disease}`,
          precautions: precautions.get(record.disease) || [],
          severity,
          specialist: this.specialistMapping[record.disease] || 'General Practitioner'
        };
      });

      this.initialized = true;
      console.log(`Loaded ${this.diseases.length} diseases from Kaggle dataset`);
    } catch (error) {
      console.error('Error initializing medical knowledge base:', error);
      this.initialized = false;
    }
  }

  // Determine severity based on disease name and symptoms
  private determineSeverity(disease: string, symptoms: string[]): 'low' | 'medium' | 'high' | 'critical' {
    if (this.criticalConditions.includes(disease)) {
      return 'critical';
    }

    // Calculate severity based on symptom weights
    let totalWeight = 0;
    let symptomCount = 0;

    symptoms.forEach(symptom => {
      const weight = this.symptomSeverity.get(symptom) || 1;
      totalWeight += weight;
      symptomCount++;
    });

    const averageWeight = symptomCount > 0 ? totalWeight / symptomCount : 1;

    if (averageWeight >= 6) return 'high';
    if (averageWeight >= 4) return 'medium';
    return 'low';
  }

  // Enhanced symptom matching with Kaggle data
  public matchSymptoms(userInput: string): MedicalCondition[] {
    this.initialize();

    const userSymptoms = this.parseUserInput(userInput);
    const scoredConditions = this.diseases.map(condition => {
      const score = this.calculateMatchScore(userSymptoms, condition);
      return { ...condition, matchScore: score };
    });

    return scoredConditions
      .filter(condition => condition.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);
  }

  // Parse and normalize user input
  private parseUserInput(input: string): string[] {
    const cleaned = input.toLowerCase()
      .replace(/[^\w\s,]/g, '')
      .split(/[,\n]/)
      .map(s => s.trim())
      .filter(s => s.length > 2);

    // Expand with synonyms
    const expanded: string[] = [];
    cleaned.forEach(symptom => {
      expanded.push(symptom);
      
      // Add synonyms
      Object.entries(this.symptomSynonyms).forEach(([key, synonyms]) => {
        if (synonyms.some(syn => symptom.includes(syn) || syn.includes(symptom))) {
          expanded.push(key);
        }
      });
    });

    return [...new Set(expanded)];
  }

  // Calculate match score using weighted symptoms
  private calculateMatchScore(userSymptoms: string[], condition: MedicalCondition): number {
    let score = 0;
    let matches = 0;

    userSymptoms.forEach(userSymptom => {
      condition.symptoms.forEach(conditionSymptom => {
        if (this.isSymptomMatch(userSymptom, conditionSymptom)) {
          matches++;
          
          // Weight by symptom severity
          const weight = this.symptomSeverity.get(conditionSymptom) || 1;
          score += weight;
          
          // Bonus for critical conditions
          if (condition.severity === 'critical') {
            score += 2;
          }
        }
      });
    });

    // Normalize score
    const maxPossibleScore = condition.symptoms.length * 5; // Max weight is typically 5
    const normalizedScore = (score / maxPossibleScore) * 100;
    
    // Boost for multiple matches
    const matchBonus = matches > 1 ? matches * 5 : 0;
    
    return Math.min(normalizedScore + matchBonus, 100);
  }

  // Enhanced symptom matching
  private isSymptomMatch(userSymptom: string, conditionSymptom: string): boolean {
    const user = userSymptom.toLowerCase();
    const condition = conditionSymptom.toLowerCase();

    // Direct match
    if (user.includes(condition) || condition.includes(user)) return true;

    // Synonym match
    const synonyms = this.symptomSynonyms[condition] || [];
    return synonyms.some(synonym => 
      user.includes(synonym.toLowerCase()) || synonym.toLowerCase().includes(user)
    );
  }

  // Check if emergency case
  public isEmergencyCase(conditions: MedicalCondition[]): boolean {
    return conditions.some(condition => 
      condition.severity === 'critical' && condition.matchScore! > 30
    );
  }

  // Get comprehensive recommendations
  public getRecommendations(conditions: MedicalCondition[]) {
    if (conditions.length === 0) {
      return {
        primaryCondition: "No clear match found",
        specialist: "General Practitioner",
        urgency: "Low - Consult a doctor for proper evaluation",
        description: "Symptoms don't match common conditions in our database",
        confidence: 0,
        isEmergency: false,
        precautions: [],
        alternatives: []
      };
    }

    const topCondition = conditions[0];
    
    return {
      primaryCondition: topCondition.name,
      specialist: topCondition.specialist,
      urgency: this.determineUrgency(topCondition),
      description: topCondition.description,
      confidence: Math.round(topCondition.matchScore!),
      isEmergency: this.isEmergencyCase([topCondition]),
      precautions: topCondition.precautions,
      alternatives: conditions.slice(1, 3).map(c => ({
        condition: c.name,
        confidence: Math.round(c.matchScore!)
      }))
    };
  }

  // Determine urgency level
  private determineUrgency(condition: MedicalCondition): string {
    if (condition.severity === 'critical') return 'Emergency - Seek immediate care';
    if (condition.severity === 'high' && condition.matchScore! > 50) return 'High - See doctor within 24 hours';
    if (condition.severity === 'medium' && condition.matchScore! > 30) return 'Medium - Schedule appointment soon';
    return 'Low - Monitor symptoms';
  }

  // Get disease statistics
  public getStats() {
    this.initialize();
    return {
      totalDiseases: this.diseases.length,
      totalSymptoms: this.csvLoader.getAllSymptoms().length,
      criticalConditions: this.diseases.filter(d => d.severity === 'critical').length,
      specialists: [...new Set(this.diseases.map(d => d.specialist))].length
    };
  }
}