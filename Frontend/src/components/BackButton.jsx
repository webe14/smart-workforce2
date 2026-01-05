
import { useNavigate } from 'react-router-dom';

const BackButton = () => {
    const navigate = useNavigate();

    return (
        <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center space-x-2 text-gray-600 hover:text-purple-600 transition-colors duration-200 mb-4"
        >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-medium">Back to Dashboard</span>
        </button>
    );
};

export default BackButton;
