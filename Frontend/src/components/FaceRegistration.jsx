import React, { useState, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import FaceRecognitionService from '../services/FaceRecognitionService';

const FaceRegistration = ({ onRegister, onClose }) => {
    const videoRef = useRef();
    const streamRef = useRef(null); // Add streamRef for robust cleanup
    const [status, setStatus] = useState('loading'); // loading, ready, scanning, success, error
    const [message, setMessage] = useState('Loading face recognition models...');
    // Removed stream state to rely on ref for cleanup, avoiding race conditions

    useEffect(() => {
        const init = async () => {
            try {
                await FaceRecognitionService.loadModels();
                setStatus('ready');
                setMessage('Ready to scan. Please look at the camera.');
                startVideo();
            } catch (err) {
                console.error(err);
                setStatus('error');
                setMessage('Failed to load models');
            }
        };
        init();

        return () => {
            stopVideo();
        };
    }, []);

    const startVideo = async () => {
        try {
            stopVideo(); // Ensure any existing stream is stopped
            const currentStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: "user"
                }
            });

            streamRef.current = currentStream; // Store in ref
            if (videoRef.current) {
                videoRef.current.srcObject = currentStream;
            }
        } catch (err) {
            console.error('Camera Error:', err);
            setStatus('error');

            let userMessage = 'Camera access denied';
            if (err.name === 'NotAllowedError') {
                userMessage = 'Camera permission denied. Please enable camera access in your browser settings.';
            } else if (err.name === 'NotFoundError') {
                userMessage = 'No camera found on this device.';
            } else if (err.name === 'NotReadableError') {
                userMessage = 'Camera is already in use by another application.';
            } else if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
                userMessage = 'Camera access requires HTTPS in most browsers.';
            }

            setMessage(userMessage);
        }
    };

    const stopVideo = () => {
        if (detectionInterval.current) {
            clearInterval(detectionInterval.current);
            detectionInterval.current = null;
        }

        // Robust track stopping using ref
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                try {
                    track.stop();
                } catch (e) {
                    console.error("Error stopping track:", e);
                }
            });
            streamRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    const detectionInterval = useRef(null);

    const scanFace = async () => {
        if (!videoRef.current) return;

        setStatus('scanning');
        setMessage('Scanning... Please maintain your position.');

        let attempts = 0;
        const maxAttempts = 50; // About 10 seconds of scanning if checking every 200ms

        if (detectionInterval.current) clearInterval(detectionInterval.current);

        detectionInterval.current = setInterval(async () => {
            attempts++;

            if (attempts > maxAttempts) {
                clearInterval(detectionInterval.current);
                detectionInterval.current = null;
                setStatus('ready');
                setMessage('Face detection timed out. Please try again in better lighting.');
                return;
            }

            try {
                // Use TinyFaceDetector for better reliability like in AttendanceScanner
                const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });

                const detection = await faceapi.detectSingleFace(videoRef.current, options)
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                if (detection) {
                    clearInterval(detectionInterval.current);
                    detectionInterval.current = null;
                    setStatus('success');
                    setMessage('Face scanned successfully!');

                    // Convert descriptor to regular array for storage
                    const descriptorArray = Array.from(detection.descriptor);

                    setTimeout(() => {
                        onRegister(descriptorArray);
                        stopVideo();
                    }, 1000);
                }
            } catch (err) {
                console.error('Detection error:', err);
                // Continue to next attempt unless it's a fatal error
            }
        }, 200);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Register Face ID</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden mb-4">
                    {status === 'loading' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    )}
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        className={`w-full h-full object-cover ${status === 'loading' ? 'hidden' : ''}`}
                    />
                    {status === 'scanning' && (
                        <div className="absolute inset-0 border-4 border-indigo-500 animate-pulse bg-indigo-500/10"></div>
                    )}
                </div>

                <div className="text-center mb-6">
                    <p className={`font-medium ${status === 'error' ? 'text-red-600' : 'text-gray-700'}`}>
                        {message}
                    </p>
                </div>

                <div className="flex justify-center space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={scanFace}
                        disabled={status !== 'ready'}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {status === 'scanning' ? 'Scanning...' : 'Scan Face'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FaceRegistration;
