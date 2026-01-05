import React from 'react';

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-slate-900 text-white py-6 mt-auto">
            <div className="container mx-auto px-6">
                <div className="flex flex-col md:flex-row justify-between items-center bg-gray-900">
                    <div className="mb-4 md:mb-0">
                        <h5 className="text-lg font-bold">Ferenje Medium Clinic </h5>
                        <p className="text-gray-400 text-sm">Efficient attendance and payroll management.</p>
                    </div>

                    <div className="flex space-x-6">
                        <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Privacy Policy</a>
                        <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Terms of Service</a>
                        <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Contact Support</a>
                    </div>
                </div>

                <div className="border-t border-gray-800 mt-6 pt-4 text-center md:text-left">
                    <p className="text-gray-500 text-xs">
                        &copy; {currentYear} Ferenje Medium Clinic . All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
