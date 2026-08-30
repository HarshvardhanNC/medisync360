import { spawn } from 'child_process';
import path from 'path';
import { PredictionApiResponse, TriageContext } from '../types/predictionContract';

export class MLModelService {
  private pythonPath: string;
  private scriptPath: string;

  constructor() {
    this.pythonPath = 'python';
    this.scriptPath = path.join(__dirname, '../../ml_model/enhanced_predict_service.py');
  }

  /**
   * Predict disease from symptoms and triageContext using enhanced trained ML model
   */
  public async predictDisease(symptoms: string, triageContext?: TriageContext): Promise<PredictionApiResponse> {
    return new Promise((resolve, reject) => {
      if (!symptoms || symptoms.trim().length === 0) {
        reject(new Error("Please provide at least one symptom"));
        return;
      }

      console.log(`Enhanced ML Model analyzing symptoms: ${symptoms}`);

      // Prepare payload argument
      const payloadArg = JSON.stringify({
        symptoms,
        triageContext: triageContext || { rounds: [] }
      });

      // Spawn Python process
      const pythonProcess = spawn(this.pythonPath, [this.scriptPath, payloadArg], {
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
        if (code !== 0) {
          console.error(`Python process error: ${errorData}`);
          reject(new Error(`Enhanced ML model prediction failed: ${errorData}`));
          return;
        }

        try {
          const result: PredictionApiResponse = JSON.parse(outputData);
          
          if ((result as any).error) {
            reject(new Error((result as any).error));
            return;
          }

          console.log(`Enhanced ML Decision: ${result.decision || result.decisionAction} - ${result.predictedCondition} (${result.confidence}% confidence)`);
          resolve(result);

        } catch (parseError) {
          console.error('Failed to parse enhanced ML model output:', outputData);
          reject(new Error(`Failed to parse enhanced ML model response: ${parseError}`));
        }
      });

      pythonProcess.on('error', (error) => {
        console.error('Failed to start Python process:', error);
        reject(new Error(`Failed to start enhanced ML model: ${error.message}`));
      });

      setTimeout(() => {
        pythonProcess.kill();
        reject(new Error('Enhanced ML model prediction timeout'));
      }, 30000);
    });
  }

  /**
   * Get metadata and configuration information about the ML model
   */
  public async getModelInfo(): Promise<any> {
    const metadataPath = path.join(__dirname, '../../ml_model/trained_model/metadata.json');
    try {
      const fs = require('fs');
      if (fs.existsSync(metadataPath)) {
        const data = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        return {
          modelType: 'Isotonically Calibrated Classifier + Clarification Engine',
          modelVersion: 'medisync360-v2.0-calibrated-rf',
          totalSymptoms: data.symptoms ? data.symptoms.length : 131,
          totalDiseases: data.diseases ? data.diseases.length : 41,
          supportedDecisions: ['PREDICT', 'CLARIFY', 'ABSTAIN', 'URGENT_ESCALATION'],
        };
      }
    } catch (e) {
      console.warn('Could not read metadata file directly:', e);
    }
    return {
      modelType: 'Isotonically Calibrated Classifier',
      modelVersion: 'medisync360-v2.0-calibrated-rf',
      totalSymptoms: 131,
      totalDiseases: 41,
      supportedDecisions: ['PREDICT', 'CLARIFY', 'ABSTAIN', 'URGENT_ESCALATION'],
    };
  }

  /**
   * Health check for ML model service
   */
  public async healthCheck(): Promise<boolean> {
    try {
      const result = await this.predictDisease("fever, cough");
      return result && (result.predictedCondition !== undefined || result.decision !== undefined);
    } catch (error) {
      console.error('ML Model health check failed:', error);
      return false;
    }
  }
}