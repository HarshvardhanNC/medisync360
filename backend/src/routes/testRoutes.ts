import express from 'express';
import { MLModelService } from '../services/mlModelService';
import { getMLModelStatus } from '../services/aiService';

const router = express.Router();
const mlService = new MLModelService();

// Test endpoint to verify ML model status
router.get('/ml-status', async (req, res) => {
  try {
    const status = await getMLModelStatus();
    res.json({
      success: true,
      ...status
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "ML Model is not available"
    });
  }
});

// Test ML model prediction directly
router.post('/ml-predict', async (req, res) => {
  try {
    const { symptoms } = req.body;
    
    if (!symptoms) {
      return res.status(400).json({
        success: false,
        error: "Symptoms are required"
      });
    }
    
    const result = await mlService.predictDisease(symptoms);
    
    res.json({
      success: true,
      input: symptoms,
      prediction: result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Batch prediction test
router.post('/ml-batch-predict', async (req, res) => {
  try {
    const { symptomSets } = req.body;
    
    if (!symptomSets || !Array.isArray(symptomSets)) {
      return res.status(400).json({
        success: false,
        error: "symptomSets array is required"
      });
    }
    
    const results = await mlService.batchPredict(symptomSets);
    
    res.json({
      success: true,
      totalPredictions: results.length,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test single symptom predictions
router.get('/test-single-symptoms', async (req, res) => {
  try {
    const results = await mlService.testSingleSymptoms();
    
    res.json({
      success: true,
      ...results
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;