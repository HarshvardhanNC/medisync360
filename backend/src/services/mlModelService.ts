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
    return new Promise((resolve, reject) => {
      if (!symptoms || symptoms.trim().length === 0) {
        reject(new Error("Please provide at least one symptom"));
        return;
      }

      console.log(`Enhanced ML Model analyzing symptoms: ${symptoms}`);

      // Spawn Python process
      const pythonProcess = spawn(this.pythonPath, [this.scriptPath, symptoms], {
        cwd: path.dirname(this.scriptPath)
      });

      let outputData = '';
      let errorData = '';

      // Collect stdout data
      pythonProcess.stdout.on('data', (data) => {
        outputData += data.toString();
      });

      // Collect stderr data
      pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
      });

      // Handle process completion
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`Python process error: ${errorData}`);
          reject(new Error(`Enhanced ML model prediction failed: ${errorData}`));
          return;
        }

        try {
          // Parse JSON output
          const result = JSON.parse(outputData);
          
          if (result.error) {
            reject(new Error(result.error));
            return;
          }

          console.log(`Enhanced ML Prediction: ${result.predictedCondition} (${result.confidence}% confidence)`);
          resolve(result);

        } catch (parseError) {
          console.error('Failed to parse enhanced ML model output:', outputData);
          reject(new Error(`Failed to parse enhanced ML model response: ${parseError}`));
        }
      });

      // Handle process errors
      pythonProcess.on('error', (error) => {
        console.error('Failed to start Python process:', error);
        reject(new Error(`Failed to start enhanced ML model: ${error.message}`));
      });

      // Set timeout for long-running processes
      setTimeout(() => {
        pythonProcess.kill();
        reject(new Error('Enhanced ML model prediction timeout'));
      }, 30000); // 30 second timeout
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