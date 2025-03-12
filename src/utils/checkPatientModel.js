// Simple script to check if the Patient model is properly exported
const patientModel = require('../models/patient.model');

console.log('Patient model:', patientModel);
console.log('Patient model type:', typeof patientModel);
console.log('Patient model constructor:', patientModel.constructor?.name);
console.log('Patient model methods:', Object.getOwnPropertyNames(patientModel));
console.log('Patient.create:', patientModel.create);
console.log('Patient.findByNationalId:', patientModel.findByNationalId); 