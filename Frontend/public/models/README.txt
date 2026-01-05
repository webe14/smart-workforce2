
# Model Download Instructions

The Face Recognition feature requires model files to be placed in `Frontend/public/models`.

Please download the following files and place them in:
`smart-workforce-frontend/public/models/`

**Required Models:**
1. **ssd_mobilenet_v1** (for face detection)
2. **face_landmark_68** (for landmarks)
3. **face_recognition** (for descriptors)

**You can download the weights (shard files and manifests) from the face-api.js repository:**
https://github.com/justadudewhohacks/face-api.js/tree/master/weights

Required files to copy to `public/models`:
- `face_landmark_68_model-shard1`
- `face_landmark_68_model-weights_manifest.json`
- `face_recognition_model-shard1`
- `face_recognition_model-shard2`
- `face_recognition_model-weights_manifest.json`
- `ssd_mobilenet_v1_model-shard1`
- `ssd_mobilenet_v1_model-shard2`
- `ssd_mobilenet_v1_model-weights_manifest.json`

*(Note: Depending on the specific model version, there might be more shard files. Copy all relevant shards/manifests for these 3 models).*
