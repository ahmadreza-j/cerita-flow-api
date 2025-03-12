const Patient = require('../models/patient.model');
const { initializeCeritaDb } = require('../config/database');

async function testPatientModel() {
  try {
    // Initialize the database
    await initializeCeritaDb();
    
    console.log('Testing Patient model...');
    
    // Test generateUniqueFileNumber
    console.log('Testing generateUniqueFileNumber...');
    const fileNumber = await Patient.generateUniqueFileNumber();
    console.log('Generated file number:', fileNumber);
    
    // Test create
    console.log('Testing create...');
    const patientData = {
      national_id: '1234567890',
      first_name: 'Test',
      last_name: 'User',
      age: 30,
      gender: 'male',
      occupation: 'Developer',
      address: 'Test Address',
      phone: '09123456789',
      referral_source: 'Test'
    };
    
    try {
      const patientId = await Patient.create(patientData);
      console.log('Created patient with ID:', patientId);
      
      // Test findById
      console.log('Testing findById...');
      const patient = await Patient.findById(patientId);
      console.log('Found patient:', patient);
      
      // Test delete
      console.log('Testing delete...');
      const deleted = await Patient.delete(patientId);
      console.log('Deleted patient:', deleted);
    } catch (error) {
      console.error('Error in patient operations:', error);
    }
    
    console.log('Patient model tests completed');
  } catch (error) {
    console.error('Error testing Patient model:', error);
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  testPatientModel()
    .then(() => {
      console.log('Tests completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

module.exports = { testPatientModel }; 