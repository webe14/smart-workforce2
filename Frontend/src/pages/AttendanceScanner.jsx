import React, { useState, useRef, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrReader } from 'react-qr-reader';
import api from '../services/api';
import BackButton from '../components/BackButton';
import jsQR from 'jsqr';
import { AuthContext, SidebarContext } from '../context/AuthContext';
import FaceRecognitionService from '../services/FaceRecognitionService';
import * as faceapi from 'face-api.js';

const AttendanceScanner = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext); // Get current logged-in user

    // QR State
    const [result, setResult] = useState('');
    const [status, setStatus] = useState('idle'); // idle, processing, success, error
    const [message, setMessage] = useState('');
    const fileInputRef = useRef(null);
    const { setSidebarOpen } = useContext(SidebarContext);
    const [qrAction, setQrAction] = useState('checkin'); // 'checkin' or 'checkout'

    // Face Recognition State
    const [mode, setMode] = useState('qr'); // 'qr' or 'face'
    const [faceStatus, setFaceStatus] = useState('idle'); // idle, loading, ready, detecting, success
    const [faceDetectionFeedback, setFaceDetectionFeedback] = useState(''); // Helpful messages for user
    const [faceAction, setFaceActionState] = useState('checkin'); // 'checkin' or 'checkout'
    const faceActionRef = useRef('checkin'); // Ref to access current state in interval closure

    // Function to update both state and ref
    const setFaceAction = (action) => {
        setFaceActionState(action);
        faceActionRef.current = action;
    };

    const [userAttendanceStatus, setUserAttendanceStatus] = useState(null); // null, 'can_checkin', 'checked_in', 'completed'
    const videoRef = useRef();
    const canvasRef = useRef();
    const streamRef = useRef(null); // Robust stream reference for cleanup
    const detectionInterval = useRef();
    const lastDetectionTime = useRef(Date.now());

    // CRITICAL: Ref-based lock to prevent duplicate submissions (state updates are async!)
    const isProcessingRef = useRef(false);
    const [isRecognitionActive, setIsRecognitionActive] = useState(false);
    const isRecognitionActiveRef = useRef(false);


    // Cleanup video on unmount or mode change
    useEffect(() => {
        return () => {
            stopVideo();
        };
    }, [mode]);

    // Update feedback when action changes
    useEffect(() => {
        if (faceStatus === 'ready' && status === 'idle') {
            setFaceDetectionFeedback(`✓ Ready for ${faceAction === 'checkout' ? 'Check-Out' : 'Check-In'}. Please look at the camera.`);
        }
    }, [faceAction, faceStatus, status]);

    const stopVideo = () => {
        if (detectionInterval.current) {
            clearInterval(detectionInterval.current);
            detectionInterval.current = null;
        }

        // Use streamRef if available (most robust), fallback to videoRef
        const stream = streamRef.current || (videoRef.current ? videoRef.current.srcObject : null);

        if (stream) {
            const tracks = stream.getTracks();
            tracks.forEach(track => {
                track.stop();
                try {
                    if (videoRef.current && videoRef.current.srcObject) {
                        videoRef.current.srcObject.removeTrack(track);
                    }
                } catch (e) { console.warn("Track remove error", e); }
            });
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        streamRef.current = null;
    };

    const loadFaceResources = async () => {
        setFaceStatus('loading');
        setMessage('Loading face recognition models...');

        try {
            // Load models FIRST before starting video
            await FaceRecognitionService.loadModels();
            console.log('✅ Models loaded, now fetching employee data...');

            // Fetch employee face data
            setMessage('Fetching employee data...');
            const usersRes = await api.get('/users');
            await FaceRecognitionService.loadLabeledImages(usersRes.data);
            console.log('✅ Employee face data loaded');

            // Check current user's attendance status
            setMessage('Checking your attendance status...');
            const userId = user?.user_id || user?.id;
            if (userId) {
                const statusRes = await api.get(`/attendance/status?user_id=${userId}`);
                const attendanceStatus = statusRes.data.status;
                setUserAttendanceStatus(attendanceStatus);
                console.log('📊 User attendance status:', attendanceStatus);

                // Auto-set the appropriate action based on status
                if (attendanceStatus === 'checked_in') {
                    setFaceAction('checkout');
                } else if (attendanceStatus === 'completed') {
                    // User has completed attendance for today - still allow scanning but show message
                    setFaceAction('checkin'); // Default, but pre-check will block
                } else {
                    setFaceAction('checkin');
                }
            }

            // NOW start video after everything is ready
            setMessage('Starting camera...');
            await startVideo();

            setFaceStatus('ready');
            setMessage(''); // Clear loading message

            // Set appropriate feedback message
            const actionText = faceAction === 'checkout' ? 'Check-Out' : 'Check-In';
            setFaceDetectionFeedback(`✓ Ready for ${actionText}. Please look at the camera.`);
        } catch (err) {
            console.error(err);
            setFaceStatus('error');
            setMessage(err.message || 'Failed to initialize face recognition. Please check camera permissions.');
        }
    };

    const startVideo = () => {
        return new Promise((resolve, reject) => {
            navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: "user"
                }
            })
                .then(stream => {
                    streamRef.current = stream; // Save stream for robust cleanup
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                    resolve();
                })
                .catch(err => {
                    console.error(err);
                    setFaceStatus('error');
                    setMessage('Camera access denied. Please allow camera access to use face recognition.');
                    reject(new Error('Camera access denied'));
                });
        });
    };

    const handleVideoPlay = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || !canvas) return;

        console.log('📹 Video play event fired');

        // Optimize canvas for frequent readback (fixes console warning)
        const context = canvas.getContext('2d', { willReadFrequently: true });

        const displaySize = { width: video.videoWidth, height: video.videoHeight };
        faceapi.matchDimensions(canvas, displaySize);

        // Clear any existing interval to prevent duplicates
        if (detectionInterval.current) clearInterval(detectionInterval.current);

        detectionInterval.current = setInterval(async () => {
            // Use ref-based check instead of status state (async state updates cause race conditions!)
            if (isProcessingRef.current || !isRecognitionActiveRef.current) return;

            // Robust check: Ensure video is actually ready and playing
            if (video.paused || video.ended || video.readyState !== 4) {
                return;
            }

            try {
                // Use TinyFaceDetector for better performance and reliability
                const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });

                const detections = await faceapi.detectAllFaces(video, options)
                    .withFaceLandmarks()
                    .withFaceDescriptors();

                const resizedDetections = faceapi.resizeResults(detections, displaySize);

                // Clear canvas
                context.clearRect(0, 0, canvas.width, canvas.height);

                if (detections.length > 0) {
                    console.log(`✅ Detected ${detections.length} face(s)`);

                    const matcher = FaceRecognitionService.getMatcher();
                    if (matcher && !isProcessingRef.current) {
                        // Only process the first detected face
                        const detection = resizedDetections[0];
                        const result = matcher.findBestMatch(detection.descriptor);
                        console.log('🔎 Match result:', result.toString(), '| Distance:', result.distance.toFixed(3));

                        const box = detection.detection.box;
                        const drawBox = new faceapi.draw.DrawBox(box, { label: result.toString() });
                        drawBox.draw(canvas);

                        // Check confidence and trigger check-in/out
                        if (result.label !== 'unknown' && result.distance < 0.65) {
                            // CRITICAL: Set lock IMMEDIATELY before async call
                            isProcessingRef.current = true;

                            // Stop detection loop IMMEDIATELY
                            if (detectionInterval.current) {
                                clearInterval(detectionInterval.current);
                                detectionInterval.current = null;
                            }

                            setFaceDetectionFeedback(`✓ Match found! (${((1 - result.distance) * 100).toFixed(0)}% confident)`);
                            processAttendance(result.label);
                        } else if (result.label !== 'unknown' && result.distance < 0.75) {
                            setFaceDetectionFeedback(`⚠️ Weak match (${((1 - result.distance) * 100).toFixed(0)}%). Try better lighting.`);
                        } else if (result.label === 'unknown') {
                            setFaceDetectionFeedback(`❌ Not recognized. Please ensure your profile has a clear photo.`);
                        }
                    } else if (!matcher) {
                        console.warn('⚠️ No matcher available - no face descriptors loaded');
                        setFaceDetectionFeedback('⚠️ No registered faces found');
                    }
                }

                // Provide feedback based on detection
                if (detections.length === 0) {
                    const timeSinceLast = Date.now() - lastDetectionTime.current;
                    if (timeSinceLast > 3000) {
                        setFaceDetectionFeedback('👤 No face detected. Please position your face in front of the camera.');
                    }
                } else if (detections.length > 1) {
                    setFaceDetectionFeedback('⚠️ Multiple faces detected. Please ensure only one person is in frame.');
                    lastDetectionTime.current = Date.now();
                } else {
                    lastDetectionTime.current = Date.now();
                }

            } catch (error) {
                console.error('❌ Face detection error:', error);
            }
        }, 200); // Check every 200ms
    };

    const processAttendance = async (userId, action = null) => {
        // Note: Lock (isProcessingRef.current = true) is set by caller before this call
        // Also detection interval is cleared by caller

        // Use the action passed explicitly, OR the ref value (to avoid stale closures), OR default to checkin
        const currentAction = action || faceActionRef.current || 'checkin';

        try {
            setStatus('processing');
            setMessage(`Processing ${currentAction === 'checkout' ? 'check-out' : 'check-in'}...`);

            // PRE-CHECK: First check if employee can proceed with this action
            console.log(`🔍 Pre-checking attendance status for user ${userId}...`);
            const statusResponse = await api.get(`/attendance/status?user_id=${userId}`);
            const attendanceStatus = statusResponse.data;
            console.log('📊 Attendance status:', attendanceStatus);

            // Handle based on status and requested action
            if (currentAction === 'checkin') {
                if (attendanceStatus.status === 'checked_in') {
                    // Already checked in today - show error
                    throw {
                        isAlreadyCheckedIn: true,
                        message: `${attendanceStatus.user_name}, you have already checked in today. Please use Check-Out.`
                    };
                }
                if (attendanceStatus.status === 'completed') {
                    // Already completed attendance today
                    throw {
                        isCompleted: true,
                        message: `${attendanceStatus.user_name}, you have already completed your attendance for today.`
                    };
                }
            } else if (currentAction === 'checkout') {
                if (attendanceStatus.status === 'can_checkin') {
                    // Not checked in yet
                    throw {
                        isNotCheckedIn: true,
                        message: `${attendanceStatus.user_name}, you haven't checked in today. Please check in first.`
                    };
                }
                if (attendanceStatus.status === 'completed') {
                    // Already checked out
                    throw {
                        isCompleted: true,
                        message: `${attendanceStatus.user_name}, you have already checked out today.`
                    };
                }
            }

            // Proceed with the actual attendance action
            let endpoint = '/attendance/qr-checkin'; // Default
            if (mode === 'face') {
                endpoint = currentAction === 'checkout' ? '/attendance/face-checkout' : '/attendance/face-checkin';
            } else {
                // QR Mode
                endpoint = currentAction === 'checkout' ? '/attendance/qr-checkout' : '/attendance/qr-checkin';
            }

            console.log(`📤 Sending attendance request to ${endpoint} for user ${userId}`);
            const response = await api.post(endpoint, { user_id: userId });
            console.log('✅ Attendance recorded successfully');

            setStatus('success');
            setResult(response.data.message);
            setMessage(response.data.message);

            // Play success sound
            playSound('success');

            // Update attendance status to reflect the change
            const updatedStatusRes = await api.get(`/attendance/status?user_id=${userId}`);
            const newStatus = updatedStatusRes.data.status;
            setUserAttendanceStatus(newStatus);
            console.log('🔄 Updated attendance status:', newStatus);

            // Update action based on new status
            if (newStatus === 'checked_in') {
                setFaceAction('checkout'); // Just checked in, offer checkout
            } else if (newStatus === 'completed') {
                setFaceAction('checkin'); // Completed for the day
            }

            // Deactivate recognition after success
            setIsRecognitionActive(false);
            isRecognitionActiveRef.current = false;

            // Stop camera
            stopVideo();

            // Redirect to dashboard after a short delay
            setTimeout(() => {
                navigate('/dashboard');
            }, 2000);

        } catch (err) {
            console.error('Attendance error:', err);
            setStatus('error');

            // Prioritize the server's specific error message
            const errorMessage = err.response?.data?.message || err.message || 'Attendance processing failed';
            setMessage(errorMessage);

            // Play error sound
            playSound('error');

            // Check status again on error (state might be out of sync)
            if (err.response?.status === 400 && userId) {
                try {
                    const statusRes = await api.get(`/attendance/status?user_id=${userId}`);
                    const newStatus = statusRes.data.status;
                    setUserAttendanceStatus(newStatus);

                    // Update actions based on real status
                    if (newStatus === 'checked_in') setFaceAction('checkout');
                    if (newStatus === 'completed') setFaceAction('checkin');

                    // Also check if we should disable scanner (e.g. if they are completed for the day)
                    if (statusRes.data.should_disable_scanner) {
                        const today = new Date().toISOString().split('T')[0];
                        setIsScannerDisabled(true);
                        setLastCheckDate(today);
                        setFaceStatus('disabled');
                    }
                } catch (e) {
                    console.error('Failed to refresh status:', e);
                }
            }

            // Release lock on error so user can try again
            isProcessingRef.current = false;
            setIsRecognitionActive(false);
            isRecognitionActiveRef.current = false;

            // Reset status after short delay to allow scanning again
            setTimeout(() => {
                if (mode === 'face') {
                    setStatus('idle');
                    setMessage('');
                    setFaceDetectionFeedback(`✓ Ready for ${faceActionRef.current === 'checkout' ? 'Check-Out' : 'Check-In'}. Please look at the camera.`);
                    // Restart detection on error
                    if (videoRef.current && !videoRef.current.paused) {
                        handleVideoPlay();
                    }
                }
            }, 3000);
        }
    };

    // Helper function to play sounds
    const playSound = (type) => {
        try {
            if (type === 'success') {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                oscillator.frequency.value = 800;
                oscillator.type = 'sine';
                gainNode.gain.value = 0.3;
                oscillator.start();
                setTimeout(() => oscillator.stop(), 200);
            } else if (type === 'error') {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                oscillator.frequency.value = 300; // Lower frequency for error
                oscillator.type = 'sawtooth'; // Harsher sound
                gainNode.gain.value = 0.3;
                oscillator.start();
                setTimeout(() => oscillator.stop(), 400);
            }
        } catch (e) {
            console.log('Sound playback not available');
        }
    };

    // Existing QR Logic
    const processQR = async (data) => {
        if (!!data && status === 'idle' && !isProcessingRef.current) {
            try {
                const qrData = JSON.parse(data?.text || data);
                if (qrData.type !== 'attendance_qr' || !qrData.id) {
                    throw new Error('Invalid QR Code');
                }
                // Set lock before calling processAttendance
                isProcessingRef.current = true;
                processAttendance(qrData.id, qrAction);
            } catch (err) {
                console.error(err);
                isProcessingRef.current = false;
                setStatus('error');
                setMessage(err.response?.data?.message || err.message || 'Scan Failed');
                setTimeout(() => { setStatus('idle'); setMessage(''); }, 3000);
            }
        }
    };

    const handleScan = (data, error) => {
        if (data) processQR(data);
        if (!!error && error?.message) console.info(error);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                context.drawImage(img, 0, 0);
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);

                if (code) {
                    processQR(code.data);
                } else {
                    setStatus('error');
                    setMessage('No QR code found in image');
                    setTimeout(() => { setStatus('idle'); setMessage(''); }, 3000);
                }
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleModeSwitch = (newMode) => {
        if (newMode === mode) return;
        stopVideo();
        setMode(newMode);
        setStatus('idle');
        setMessage('');
        setResult('');
        if (newMode === 'face') {
            loadFaceResources();
            setIsRecognitionActive(false);
            isRecognitionActiveRef.current = false;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
            <BackButton />

            <div className="max-w-md mx-auto pt-6">
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Attendance Scanner</h1>
                    <p className="text-gray-600">Scan QR or use face recognition</p>
                </div>

                {/* Mode Switcher */}
                <div className="flex mb-6 bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200">
                    <button
                        onClick={() => handleModeSwitch('qr')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${mode === 'qr'
                            ? 'bg-indigo-600 text-white'
                            : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        QR Code
                    </button>
                    <button
                        onClick={() => handleModeSwitch('face')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${mode === 'face'
                            ? 'bg-indigo-600 text-white'
                            : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        Face Recognition
                    </button>
                </div>

                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="p-6 bg-indigo-600 text-white text-center">
                        <h1 className="text-xl font-bold">
                            {mode === 'qr' ? 'QR Scanner' : 'Face Recognition'}
                        </h1>
                        <p className="opacity-80 text-xs mt-1">
                            {mode === 'qr' ? 'Scan QR code for attendance' : 'Look at camera for attendance'}
                        </p>
                    </div>

                    <div className="relative">
                        <div className="relative rounded-xl overflow-hidden shadow-2xl bg-black aspect-square">
                            {mode === 'qr' ? (
                                <>
                                    <QrReader
                                        onResult={handleScan}
                                        constraints={{ facingMode: 'environment' }}
                                        scanDelay={500}
                                        containerStyle={{ width: '100%', height: '100%' }}
                                        videoStyle={{ objectFit: 'cover', width: '100%', height: '100%' }}
                                    />
                                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                        <div className="w-48 h-48 border-2 border-indigo-400/50 rounded-lg relative">
                                            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-indigo-500 -mt-1 -ml-1"></div>
                                            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-indigo-500 -mt-1 -mr-1"></div>
                                            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-indigo-500 -mb-1 -ml-1"></div>
                                            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-indigo-500 -mb-1 -mr-1"></div>
                                            <div className="absolute inset-x-0 h-0.5 bg-indigo-500/50 top-0 animate-[scan_2s_ease-in-out_infinite]"></div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="relative w-full h-full flex items-center justify-center">
                                    {faceStatus === 'loading' && (
                                        <div className="text-white text-center">
                                            <div className="mb-2">{message || 'Loading...'}</div>
                                            <div className="w-8 h-8 border-t-2 border-white rounded-full animate-spin mx-auto"></div>
                                        </div>
                                    )}
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        muted
                                        onPlay={handleVideoPlay}
                                        className="absolute inset-0 w-full h-full object-cover"
                                    />
                                    <canvas
                                        ref={canvasRef}
                                        className="absolute inset-0 w-full h-full"
                                    />

                                    {faceDetectionFeedback && faceStatus === 'ready' && (
                                        <div className="absolute bottom-4 left-4 right-4 space-y-3">
                                            <div className="bg-black/70 backdrop-blur-sm text-white px-4 py-3 rounded-lg text-sm font-medium text-center">
                                                {faceDetectionFeedback}
                                            </div>

                                            {!isRecognitionActive && (
                                                <button
                                                    onClick={() => {
                                                        setIsRecognitionActive(true);
                                                        isRecognitionActiveRef.current = true;
                                                    }}
                                                    className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-bold shadow-lg transform active:scale-95 transition-all text-lg animate-pulse"
                                                >
                                                    🚀 Ready to Scan
                                                </button>
                                            )}

                                            {isRecognitionActive && (
                                                <div className="flex justify-center">
                                                    <div className="bg-green-100 text-green-700 px-4 py-1 rounded-full text-xs font-bold animate-pulse flex items-center">
                                                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                                        SCANNING ACTIVE
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Status Messages */}
                        {(status !== 'idle' || message) && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="bg-black/80 backdrop-blur-sm p-6 text-center text-white flex flex-col items-center justify-center w-full h-full">
                                    {status !== 'idle' && (
                                        <div className={`text-5xl mb-4 ${status === 'success' ? 'text-green-500' : status === 'error' ? 'text-red-500' : 'text-blue-500 animate-pulse'}`}>
                                            {status === 'success' ? '✓' : status === 'error' ? '✕' : '...'}
                                        </div>
                                    )}
                                    <p className="text-lg font-semibold px-4">{message}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Upload QR Image Option */}
                    {mode === 'qr' && (
                        <div className="p-6 bg-gray-50 border-t space-y-3">
                            {/* QR Action Buttons */}
                            <div className="flex gap-3 mb-4">
                                <button
                                    onClick={() => setQrAction('checkin')}
                                    className={`flex-1 py-3 rounded-lg font-medium transition-all shadow-sm ${qrAction === 'checkin'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                        }`}
                                >
                                    ☀️ Check In
                                </button>
                                <button
                                    onClick={() => setQrAction('checkout')}
                                    className={`flex-1 py-3 rounded-lg font-medium transition-all shadow-sm ${qrAction === 'checkout'
                                        ? 'bg-orange-600 text-white'
                                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                        }`}
                                >
                                    🌙 Check Out
                                </button>
                            </div>

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-medium transition-colors shadow-sm"
                            >
                                📁 Upload QR Image
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                        </div>
                    )}

                    {/* Face Recognition Action Selection */}
                    {mode === 'face' && faceStatus === 'ready' && (
                        <div className="p-6 bg-gray-50 border-t">
                            {/* Status message */}
                            {userAttendanceStatus === 'checked_in' && (
                                <p className="text-sm text-green-600 mb-3 text-center font-medium">
                                    ✓ You are checked in today.
                                </p>
                            )}
                            {userAttendanceStatus === 'completed' && (
                                <p className="text-sm text-blue-600 mb-3 text-center font-medium">
                                    ✓ You have already completed attendance for today.
                                </p>
                            )}
                            {(userAttendanceStatus === 'can_checkin' || userAttendanceStatus === 'needs_auto_close' || !userAttendanceStatus) && (
                                <p className="text-sm text-gray-600 mb-3 text-center">Select action before scanning:</p>
                            )}


                            {/* Button controls with smart blur logic */}
                            <div className="flex gap-3 relative">
                                {/* Check In Button */}
                                <div className="flex-1 relative">
                                    <button
                                        onClick={() => setFaceAction('checkin')}
                                        disabled={
                                            status === 'processing' ||
                                            userAttendanceStatus === 'checked_in' ||
                                            userAttendanceStatus === 'completed'
                                        }
                                        className={`w-full py-3 rounded-lg font-medium transition-all shadow-sm ${faceAction === 'checkin'
                                            ? 'bg-green-600 text-white'
                                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                            } ${(userAttendanceStatus === 'checked_in' || userAttendanceStatus === 'completed')
                                                ? 'opacity-40 blur-[2px] cursor-not-allowed'
                                                : ''
                                            }`}
                                    >
                                        ☀️ Check In
                                    </button>
                                    {(userAttendanceStatus === 'checked_in' || userAttendanceStatus === 'completed') && (
                                        <div className="absolute inset-0 cursor-not-allowed" title="Already checked in today"></div>
                                    )}
                                </div>

                                {/* Check Out Button */}
                                <div className="flex-1 relative">
                                    <button
                                        onClick={() => setFaceAction('checkout')}
                                        disabled={status === 'processing'}
                                        className={`w-full py-3 rounded-lg font-medium transition-all shadow-sm ${faceAction === 'checkout'
                                            ? 'bg-orange-600 text-white'
                                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        🌙 Check Out
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AttendanceScanner;

