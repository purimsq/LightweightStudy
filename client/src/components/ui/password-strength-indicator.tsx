import React from 'react';
import { Check, X } from 'lucide-react';

export interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

export interface PasswordStrengthIndicatorProps {
  password: string;
  requirements: PasswordRequirement[];
  className?: string;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  requirements,
  className = ""
}) => {
  const getStrengthLevel = (password: string): number => {
    if (!password) return 0;
    
    let strength = 0;
    requirements.forEach(requirement => {
      if (requirement.test(password)) {
        strength++;
      }
    });
    
    return strength;
  };

  const getStrengthColor = (strength: number, total: number): string => {
    const percentage = (strength / total) * 100;
    
    if (percentage < 25) return 'bg-red-500';
    if (percentage < 50) return 'bg-orange-500';
    if (percentage < 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthText = (strength: number, total: number): string => {
    const percentage = (strength / total) * 100;
    
    if (percentage < 25) return 'Very Weak';
    if (percentage < 50) return 'Weak';
    if (percentage < 75) return 'Good';
    return 'Strong';
  };

  const strength = getStrengthLevel(password);
  const strengthColor = getStrengthColor(strength, requirements.length);
  const strengthText = getStrengthText(strength, requirements.length);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Strength Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Password Strength</span>
          <span className={`font-medium ${
            strength === 0 ? 'text-gray-400' :
            strength < requirements.length * 0.25 ? 'text-red-500' :
            strength < requirements.length * 0.5 ? 'text-orange-500' :
            strength < requirements.length * 0.75 ? 'text-yellow-500' :
            'text-green-500'
          }`}>
            {strengthText}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${strengthColor}`}
            style={{ width: `${(strength / requirements.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Requirements List */}
      <div className="space-y-2">
        {requirements.map((requirement, index) => {
          const isValid = requirement.test(password);
          return (
            <div key={index} className="flex items-center space-x-2">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                isValid ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {isValid ? (
                  <Check className="w-3 h-3 text-green-600" />
                ) : (
                  <X className="w-3 h-3 text-gray-400" />
                )}
              </div>
              <span className={`text-sm ${
                isValid ? 'text-green-600' : 'text-gray-500'
              }`}>
                {requirement.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Default password requirements
export const defaultPasswordRequirements: PasswordRequirement[] = [
  {
    label: "At least 8 characters",
    test: (password: string) => password.length >= 8
  },
  {
    label: "Contains uppercase letter",
    test: (password: string) => /[A-Z]/.test(password)
  },
  {
    label: "Contains lowercase letter",
    test: (password: string) => /[a-z]/.test(password)
  },
  {
    label: "Contains number",
    test: (password: string) => /\d/.test(password)
  },
  {
    label: "Contains special character",
    test: (password: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  }
];
