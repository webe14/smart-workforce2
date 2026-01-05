
import * as faceapi from 'face-api.js';

// Base URL for models - they should be in public/models
const MODEL_URL = '/models';

class FaceRecognitionService {
    constructor() {
        this.labeledDescriptors = [];
        this.modelsLoaded = false;
    }

    async loadModels() {
        if (this.modelsLoaded) return;

        try {
            console.log('Loading face-api models...');

            // Load models sequentially to catch specific errors
            console.log('  Loading SsdMobilenetv1...');
            await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
            console.log('  ✅ SsdMobilenetv1 loaded');

            console.log('  Loading FaceLandmark68Net...');
            await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
            console.log('  ✅ FaceLandmark68Net loaded');

            console.log('  Loading FaceRecognitionNet...');
            await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
            console.log('  ✅ FaceRecognitionNet loaded');

            console.log('  Loading TinyFaceDetector...');
            await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
            console.log('  ✅ TinyFaceDetector loaded');

            // Verify all models loaded
            if (!faceapi.nets.ssdMobilenetv1.params) throw new Error('SsdMobilenetv1 failed to load');
            if (!faceapi.nets.faceLandmark68Net.params) throw new Error('FaceLandmark68Net failed to load');
            if (!faceapi.nets.faceRecognitionNet.params) throw new Error('FaceRecognitionNet failed to load');
            if (!faceapi.nets.tinyFaceDetector.params) throw new Error('TinyFaceDetector failed to load');

            this.modelsLoaded = true;
            console.log('✅ All face-api models loaded successfully');
        } catch (error) {
            console.error('❌ Failed to load face-api models:', error);
            console.error('Error details:', error.message);
            throw error;
        }
    }

    async loadLabeledImages(users) {
        // Users should be an array of objects with { id, full_name, profile_picture }
        const labeledDescriptors = [];

        console.log(`📷 Processing ${users.length} users for face recognition...`);
        let usersWithPictures = 0;
        let usersSuccessfullyProcessed = 0;

        for (const user of users) {
            // 1. Check for stored face descriptor (FAST)
            if (user.face_descriptor) {
                try {
                    const descriptorArray = typeof user.face_descriptor === 'string'
                        ? JSON.parse(user.face_descriptor)
                        : user.face_descriptor;

                    if (Array.isArray(descriptorArray) || descriptorArray instanceof Float32Array) {
                        const descriptor = new Float32Array(Object.values(descriptorArray));
                        const userId = user.user_id ? user.user_id.toString() : user.id.toString();

                        labeledDescriptors.push(new faceapi.LabeledFaceDescriptors(
                            userId,
                            [descriptor]
                        ));
                        console.log(`    ⚡ Loaded stored face descriptor for ${user.full_name || user.id}`);
                        usersSuccessfullyProcessed++;
                        continue; // Skip image processing
                    }
                } catch (e) {
                    console.error(`    ⚠️ Failed to parse stored descriptor for ${user.full_name}:`, e);
                    // Fall through to image processing
                }
            }

            // 2. Fallback to profile picture processing (SLOW)
            if (!user.profile_picture) {
                console.log(`  ⏭️ Skipping ${user.full_name || user.id}: No profile picture or descriptor`);
                continue;
            }
            usersWithPictures++;

            try {
                const imgUrl = user.profile_picture.startsWith('http')
                    ? user.profile_picture
                    : `http://localhost:7001${user.profile_picture}`;

                console.log(`  📸 Loading image for ${user.full_name || user.id}: ${imgUrl}`);

                // Fetch the image using HTMLImageElement
                const img = await faceapi.fetchImage(imgUrl);
                console.log(`    ✓ Image loaded: ${img.width}x${img.height}`);

                // Detect the face - use SSD for better accuracy on profile pictures
                const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

                if (detections) {
                    const userId = user.user_id ? user.user_id.toString() : user.id.toString();
                    labeledDescriptors.push(new faceapi.LabeledFaceDescriptors(
                        userId,
                        [detections.descriptor]
                    ));
                    usersSuccessfullyProcessed++;
                    console.log(`    ✅ Face descriptor extracted for user ID: ${userId}`);
                } else {
                    console.warn(`    ❌ No face detected in profile picture for ${user.full_name || user.id}`);
                }
            } catch (error) {
                console.warn(`    ❌ Failed to process face for ${user.full_name || user.id}:`, error.message);
            }
        }

        this.labeledDescriptors = labeledDescriptors;
        console.log(`📊 Face loading summary: ${usersSuccessfullyProcessed}/${usersWithPictures} users with pictures processed successfully`);
        console.log(`📋 Total labeled descriptors ready for matching: ${this.labeledDescriptors.length}`);

        return labeledDescriptors;
    }

    getMatcher() {
        if (this.labeledDescriptors.length === 0) {
            console.warn('⚠️ No labeled descriptors available for matching!');
            return null;
        }
        // Use a VERY lenient threshold (0.7) for better matching with varying conditions
        // Lower value = stricter matching, Higher value = more lenient
        console.log(`🎯 Creating matcher with ${this.labeledDescriptors.length} descriptors (threshold: 0.7)`);
        return new faceapi.FaceMatcher(this.labeledDescriptors, 0.7);
    }
}

export default new FaceRecognitionService();

