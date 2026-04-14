// Simple test to verify Kaggle dataset loading
const fs = require('fs');
const path = require('path');

console.log('Testing Kaggle dataset loading...');

try {
  // Test CSV file loading
  const datasetPath = path.join(__dirname, 'src/data/dataset.csv');
  const csvContent = fs.readFileSync(datasetPath, 'utf8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  console.log(`✅ Dataset loaded: ${lines.length} lines`);
  console.log(`✅ Sample line: ${lines[1]}`);
  
  // Test symptom description loading
  const descPath = path.join(__dirname, 'src/data/symptom_Description.csv');
  const descContent = fs.readFileSync(descPath, 'utf8');
  const descLines = descContent.split('\n').filter(line => line.trim());
  
  console.log(`✅ Descriptions loaded: ${descLines.length} lines`);
  console.log(`✅ Sample description: ${descLines[1]}`);
  
  // Test precautions loading
  const precPath = path.join(__dirname, 'src/data/symptom_precaution.csv');
  const precContent = fs.readFileSync(precPath, 'utf8');
  const precLines = precContent.split('\n').filter(line => line.trim());
  
  console.log(`✅ Precautions loaded: ${precLines.length} lines`);
  console.log(`✅ Sample precaution: ${precLines[1]}`);
  
  console.log('\n🎉 All Kaggle dataset files loaded successfully!');
  
} catch (error) {
  console.error('❌ Error loading dataset:', error.message);
}