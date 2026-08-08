const express = require('express');
const router = express.Router();
const multer = require('multer');
const animationController = require('../controllers/animation.controller');

// Use memory storage for multer as we will upload directly to Supabase
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', animationController.getPublicAnimations);
router.post('/upload', upload.fields([
    { name: 'fbx', maxCount: 1 }
]), animationController.uploadAnimation);
router.post('/save/:id', animationController.saveAnimation);
router.delete('/save/:id', animationController.unsaveAnimation);
router.get('/my-saved', animationController.getMySavedAnimations);
router.get('/my-uploads', animationController.getMyUploadsAnimations);
router.delete('/:id', animationController.deleteAnimation);
router.put('/:id', upload.fields([
    { name: 'fbx', maxCount: 1 }
]), animationController.updateAnimation);

module.exports = router;
