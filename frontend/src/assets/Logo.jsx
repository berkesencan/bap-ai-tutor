import React from 'react';

const Logo = ({ className = "", size = "md" }) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16"
  };

  return (
    <div className={`flex items-center ${className}`}>
      <div className={`bg-blue-500 rounded-lg text-white flex items-center justify-center ${sizeClasses[size] || sizeClasses.md}`}>
        <span className="font-bold text-lg">BAP</span>
      </div>
      <div className="ml-2 font-bold text-gray-800">
        <div className="text-lg">BAP</div>
        <div className="text-xs text-gray-600">AI Tutor</div>
      </div>
    </div>
  );
};

export default Logo; 