const express = require('express');
const router = express.Router();
const multer = require('multer');
const characterController = require('../controllers/character.controller');

// Use memory storage for multer as we will upload directly to Supabase
const upload = multer({ storage: multer.memoryStorage() });

router.get('/discover', characterController.getDiscoverCharacters);
router.post('/upload', upload.fields([
    { name: 'icon', maxCount: 1 },
    { name: 'vrm', maxCount: 1 }
]), characterController.uploadCharacter);
router.post('/save/:id', characterController.saveCharacter);
router.delete('/save/:id', characterController.unsaveCharacter);
router.post('/preview-voice', characterController.previewVoice);
router.get('/my-saved', characterController.getMySavedCharacters);
router.get('/my-uploads', characterController.getMyUploadsCharacters);
router.put('/upload/:id', upload.fields([
    { name: 'icon', maxCount: 1 },
    { name: 'vrm', maxCount: 1 }
]), characterController.updateCharacter);
router.delete('/:id', characterController.deleteCharacter);
module.exports = router;
