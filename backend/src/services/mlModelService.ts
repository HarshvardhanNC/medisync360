import { spawn } from 'child_process';
import path from 'path';

interface MLPredictionResult {
  predictedCondition: string;
  recommendedSpecialist: string;
  urgencyLevel: string;
  description: string;
  confidence: number;
  matchedSymptoms: string[];
  alternativePossibilities: Array<{
    condition: string;
    confidence: number;
  }>;
  precautions: string[];
  dataSource: string;
  modelType: string;
  needs_more_info?: boolean;
  follow_up_questions?: string[];
}

export class MLModelService {
  private pythonPath: string;
  private scriptPath: string;

  constructor() {
    this.pythonPath = 'python'; // or 'python3' depending on system
    this.scriptPath = path.join(__dirname, '../../ml_model/enhanced_predict_service.py');
  }

  /**
   * Predict disease from symptoms using enhanced trained ML model
   */
  public async predictDisease(symptoms: string): Promise<MLPredictionResult> {
    if (!symptoms || symptoms.trim().length === 0) {
      throw new Error("Please provide at least one symptom");
    }

    console.log(`Enhanced ML Model analyzing symptoms: ${symptoms}`);

    // Tier 1: Fast HTTP call to running Flask AI Service (Port 5001)
    try:
      const flaskResponse = await fetch('http://127.0.0.1:5001/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms }),
      });

      if (flaskResponse.ok) {
        const result = (await flaskResponse.json()) as MLPredictionResult;
        console.log(`Flask ML Prediction: ${result.predictedCondition} (${result.confidence}% confidence)`);
        return result;
      }
    } catch (httpError) {
      console.warn("Flask server port 5001 not reachable, falling back to Python CLI spawn...", httpError);
    }

    // Tier 2: Fallback to CLI Python Process Spawn
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn(this.pythonPath, [this.scriptPath, symptoms], {
        cwd: path.dirname(this.scriptPath)
      });

      let outputData = '';
      let errorData = '';

      pythonProcess.stdout.on('data', (data) => {
        outputData += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
      });

      pythonProcess.on('close', (code) => {
        // Extract JSON from outputData if present
        const jsonMatch = outputData.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const result = JSON.parse(jsonMatch[0]);
            if (result.predictedCondition) {
              console.log(`Enhanced ML CLI Prediction: ${result.predictedCondition} (${result.confidence}% confidence)`);
              resolve(result);
              return;
            }
          } catch (e) {
            // Ignore parse failure and fall through
          }
        }

        if (code !== 0 && !outputData.includes('predictedCondition')) {
          console.error(`Python process error: ${errorData}`);
          reject(new Error(`Enhanced ML model prediction failed: ${errorData}`));
          return;
        }

        try {
          const result = JSON.parse(outputData);
          resolve(result);
        } catch (parseError) {
          reject(new Error(`Failed to parse ML response: ${parseError}`));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start ML model: ${error.message}`));
      });

      setTimeout(() => {
        pythonProcess.kill();
        reject(new Error('Enhanced ML model prediction timeout'));
      }, 30000);
    });
  }

  /**
   * Get enhanced model statistics and health check
   */
  public async getModelInfo(): Promise<any> {
    return new Promise((resolve, reject) => {
      const testSymptoms = "headache"; // Simple single symptom test
      
      this.predictDisease(testSymptoms)
        .then((result) => {
          resolve({
            status: 'healthy',
            modelType: result.modelType,
            dataSource: result.dataSource,
            enhancedFeatures: {
              singleSymptomSupport: true,
              fuzzyMatching: true,
              synonymRecognition: true,
              confidenceBoosting: true
            },
            testPrediction: {
              symptoms: testSymptoms,
              prediction: result.predictedCondition,
              confidence: result.confidence,
              matchedSymptoms: result.matchedSymptoms
            },
            timestamp: new Date().toISOString()
          });
        })
        .catch((error) => {
          reject({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
          });
        });
    });
  }

  /**
   * Batch prediction for multiple symptom sets
   */
  public async batchPredict(symptomSets: string[]): Promise<MLPredictionResult[]> {
    const predictions: MLPredictionResult[] = [];
    
    for (const symptoms of symptomSets) {
      try {
        const result = await this.predictDisease(symptoms);
        predictions.push(result);
      } catch (error) {
        console.error(`Batch prediction failed for symptoms: ${symptoms}`, error);
        // Add error result
        predictions.push({
          predictedCondition: 'Prediction Failed',
          recommendedSpecialist: 'General Practitioner',
          urgencyLevel: 'Low - Consult a doctor',
          description: `Error: ${error}`,
          confidence: 0,
          matchedSymptoms: [],
          alternativePossibilities: [],
          precautions: ['Consult healthcare professional'],
          dataSource: 'Enhanced ML Model Error',
          modelType: 'Gradient Boosting Classifier'
        });
      }
    }
    
    return predictions;
  }

  /**
   * Test single symptom predictions
   */
  public async testSingleSymptoms(): Promise<any> {
    const testSymptoms = [
      'headache',
      'fever',
      'cough',
      'chest pain',
      'nausea',
      'stomach pain',
      'fatigue',
      'dizziness'
    ];

    const results = [];
    
    for (const symptom of testSymptoms) {
      try {
        const result = await this.predictDisease(symptom);
        results.push({
          symptom,
          prediction: result.predictedCondition,
          confidence: result.confidence,
          specialist: result.recommendedSpecialist
        });
      } catch (error) {
        results.push({
          symptom,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return {
      testType: 'Single Symptom Predictions',
      results,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validate enhanced model availability
   */
  public async validateModel(): Promise<boolean> {
    try {
      await this.getModelInfo();
      return true;
    } catch (error) {
      console.error('Enhanced model validation failed:', error);
      return false;
    }
  }
}