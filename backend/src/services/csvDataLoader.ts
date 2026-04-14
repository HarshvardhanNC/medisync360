import fs from 'fs';
import path from 'path';

interface DiseaseRecord {
  disease: string;
  symptoms: string[];
}

interface DiseaseDescription {
  disease: string;
  description: string;
}

interface DiseasePrecaution {
  disease: string;
  precautions: string[];
}

interface SymptomSeverity {
  symptom: string;
  weight: number;
}

export class CSVDataLoader {
  private dataPath: string;

  constructor() {
    this.dataPath = path.join(__dirname, '../data');
  }

  // Parse main dataset CSV
  public loadDiseaseSymptomData(): DiseaseRecord[] {
    const csvPath = path.join(this.dataPath, 'dataset.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    // Skip header
    const dataLines = lines.slice(1);
    const diseaseMap = new Map<string, Set<string>>();

    dataLines.forEach(line => {
      const columns = line.split(',').map(col => col.trim());
      const disease = columns[0];
      
      if (disease) {
        if (!diseaseMap.has(disease)) {
          diseaseMap.set(disease, new Set());
        }
        
        // Extract symptoms from columns 1-17
        for (let i = 1; i < columns.length && i <= 17; i++) {
          const symptom = columns[i]?.trim();
          if (symptom && symptom !== '') {
            // Clean symptom name
            const cleanSymptom = symptom.replace(/[_]/g, ' ').toLowerCase();
            diseaseMap.get(disease)!.add(cleanSymptom);
          }
        }
      }
    });

    // Convert to array format
    return Array.from(diseaseMap.entries()).map(([disease, symptoms]) => ({
      disease,
      symptoms: Array.from(symptoms)
    }));
  }

  // Parse disease descriptions
  public loadDiseaseDescriptions(): Map<string, string> {
    const csvPath = path.join(this.dataPath, 'symptom_Description.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    const descriptions = new Map<string, string>();
    
    // Skip header
    const dataLines = lines.slice(1);
    
    dataLines.forEach(line => {
      const commaIndex = line.indexOf(',');
      if (commaIndex > 0) {
        const disease = line.substring(0, commaIndex).trim();
        const description = line.substring(commaIndex + 1).trim().replace(/"/g, '');
        descriptions.set(disease, description);
      }
    });

    return descriptions;
  }

  // Parse disease precautions
  public loadDiseasePrecautions(): Map<string, string[]> {
    const csvPath = path.join(this.dataPath, 'symptom_precaution.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    const precautions = new Map<string, string[]>();
    
    // Skip header
    const dataLines = lines.slice(1);
    
    dataLines.forEach(line => {
      const columns = line.split(',').map(col => col.trim());
      const disease = columns[0];
      
      if (disease) {
        const precautionList: string[] = [];
        
        // Extract precautions from columns 1-4
        for (let i = 1; i < columns.length && i <= 4; i++) {
          const precaution = columns[i]?.trim();
          if (precaution && precaution !== '') {
            precautionList.push(precaution);
          }
        }
        
        precautions.set(disease, precautionList);
      }
    });

    return precautions;
  }

  // Parse symptom severity weights
  public loadSymptomSeverity(): Map<string, number> {
    const csvPath = path.join(this.dataPath, 'Symptom-severity.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    const severityMap = new Map<string, number>();
    
    // Skip header
    const dataLines = lines.slice(1);
    
    dataLines.forEach(line => {
      const columns = line.split(',').map(col => col.trim());
      const symptom = columns[0]?.replace(/[_]/g, ' ').toLowerCase();
      const weight = parseInt(columns[1]) || 1;
      
      if (symptom) {
        severityMap.set(symptom, weight);
      }
    });

    return severityMap;
  }

  // Get all unique diseases
  public getAllDiseases(): string[] {
    const diseaseData = this.loadDiseaseSymptomData();
    return diseaseData.map(record => record.disease);
  }

  // Get all unique symptoms
  public getAllSymptoms(): string[] {
    const diseaseData = this.loadDiseaseSymptomData();
    const allSymptoms = new Set<string>();
    
    diseaseData.forEach(record => {
      record.symptoms.forEach(symptom => allSymptoms.add(symptom));
    });
    
    return Array.from(allSymptoms);
  }
}